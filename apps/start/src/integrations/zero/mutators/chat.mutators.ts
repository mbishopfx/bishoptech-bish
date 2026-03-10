import {
  defineMutator,
} from '@rocicorp/zero'
import { z } from 'zod'
import { sanitizeThreadDisabledToolKeys } from '@/lib/chat-backend/domain/tool-policy'
import { isChatModeId, resolveEffectiveChatMode } from '@/lib/chat-modes'
import {
  DEFAULT_ORG_TOOL_POLICY,
  EMPTY_ORG_PROVIDER_KEY_STATUS,
  type OrgAiPolicy,
} from '@/lib/model-policy/types'
import { zql } from '../zql'
import { ROOT_BRANCH_PARENT_KEY } from '@/lib/chat-branching/branch-resolver'

/**
 * Client-callable mutators only. Thread and message creation are server-only:
 * the chat backend uses the Zero DB adapter (tx.mutate.*) in-process and
 * does not invoke mutators by name. All mutators here use ctx.userID for
 * ownership; no mutator trusts caller-provided user IDs.
 */
const renameThreadArgs = z.object({
  threadId: z.string(),
  title: z.string().trim().min(1).max(160),
})

const archiveThreadArgs = z.object({
  threadId: z.string(),
})

const deleteThreadArgs = z.object({
  threadId: z.string(),
})

const selectBranchChildArgs = z.object({
  threadId: z.string(),
  parentMessageId: z.string(),
  childMessageId: z.string(),
  expectedBranchVersion: z.number().int().positive(),
})

const setThreadModeArgs = z.object({
  threadId: z.string(),
  modeId: z.string().nullable(),
})

const setThreadDisabledToolKeysArgs = z.object({
  threadId: z.string(),
  disabledToolKeys: z.array(z.string()),
})

/**
 * Builds the minimum org policy snapshot needed by tool-policy resolution from
 * Zero rows available inside a mutator transaction.
 */
function buildOrgToolPolicy(input: {
  organizationId?: string
  policyRow?: {
    organizationId?: string
    disabledProviderIds?: readonly string[]
    disabledModelIds?: readonly string[]
    complianceFlags?: Record<string, boolean>
    providerNativeToolsEnabled?: boolean | null
    externalToolsEnabled?: boolean | null
    disabledToolKeys?: readonly string[]
    enforcedModeId?: string | null
    updatedAt?: number
  } | null
}): OrgAiPolicy | undefined {
  const organizationId =
    input.organizationId?.trim() ??
    input.policyRow?.organizationId?.trim()
  if (!organizationId) return undefined

  return {
    organizationId,
    disabledProviderIds: input.policyRow?.disabledProviderIds ?? [],
    disabledModelIds: input.policyRow?.disabledModelIds ?? [],
    complianceFlags: input.policyRow?.complianceFlags ?? {},
    toolPolicy: {
      providerNativeToolsEnabled:
        input.policyRow?.providerNativeToolsEnabled ??
        DEFAULT_ORG_TOOL_POLICY.providerNativeToolsEnabled,
      externalToolsEnabled:
        input.policyRow?.externalToolsEnabled ??
        DEFAULT_ORG_TOOL_POLICY.externalToolsEnabled,
      disabledToolKeys:
        input.policyRow?.disabledToolKeys ??
        DEFAULT_ORG_TOOL_POLICY.disabledToolKeys,
    },
    enforcedModeId:
      input.policyRow?.enforcedModeId &&
      isChatModeId(input.policyRow.enforcedModeId)
        ? input.policyRow.enforcedModeId
        : undefined,
    providerKeyStatus: EMPTY_ORG_PROVIDER_KEY_STATUS,
    updatedAt: input.policyRow?.updatedAt ?? Date.now(),
  }
}

export const chatMutatorDefinitions = {
  threads: {
    rename: defineMutator(renameThreadArgs, async ({ tx, args, ctx }) => {
      const thread = await tx.run(zql.thread.where('threadId', args.threadId).one())
      if (!thread || thread.userId !== ctx.userID) {
        return
      }

      await tx.mutate.thread.update({
        id: thread.id,
        title: args.title,
        userSetTitle: true,
        updatedAt: Date.now(),
      })
    }),

    archive: defineMutator(archiveThreadArgs, async ({ tx, args, ctx }) => {
      const thread = await tx.run(zql.thread.where('threadId', args.threadId).one())
      if (!thread || thread.userId !== ctx.userID) {
        return
      }

      await tx.mutate.thread.update({
        id: thread.id,
        visibility: 'archived',
        updatedAt: Date.now(),
      })
    }),

    /** Permanently delete thread and all its messages. */
    delete: defineMutator(deleteThreadArgs, async ({ tx, args, ctx }) => {
      const thread = await tx.run(zql.thread.where('threadId', args.threadId).one())
      if (!thread || thread.userId !== ctx.userID) {
        return
      }

      const messages = await tx.run(
        zql.message.where('threadId', args.threadId).where('userId', ctx.userID),
      )
      for (const message of messages) {
        await tx.mutate.message.delete({ id: message.id })
      }
      await tx.mutate.thread.delete({ id: thread.id })
    }),

    /**
     * Persist canonical branch selection for a parent message.
     * This mutator is optimistic-concurrency-safe via `expectedBranchVersion`.
     */
    selectBranchChild: defineMutator(
      selectBranchChildArgs,
      async ({ tx, args, ctx }) => {
        const thread = await tx.run(zql.thread.where('threadId', args.threadId).one())
        if (!thread || thread.userId !== ctx.userID) {
          return
        }

        if (thread.branchVersion !== args.expectedBranchVersion) {
          throw new Error('branch_version_conflict')
        }
        if (
          thread.generationStatus === 'pending' ||
          thread.generationStatus === 'generation'
        ) {
          throw new Error('branch_switch_while_generating')
        }

        const parent = await tx.run(
          zql.message
            .where('threadId', args.threadId)
            .where('messageId', args.parentMessageId)
            .where('userId', ctx.userID)
            .one(),
        )
        if (args.parentMessageId !== ROOT_BRANCH_PARENT_KEY && !parent) {
          return
        }

        const child = await tx.run(
          zql.message
            .where('threadId', args.threadId)
            .where('messageId', args.childMessageId)
            .where('userId', ctx.userID)
            .one(),
        )
        const parentMatch =
          args.parentMessageId === ROOT_BRANCH_PARENT_KEY
            ? !child?.parentMessageId
            : child?.parentMessageId === args.parentMessageId
        if (!child || !parentMatch) {
          return
        }

        const activeChildByParent =
          thread.activeChildByParent &&
          typeof thread.activeChildByParent === 'object'
            ? { ...thread.activeChildByParent }
            : {}

        if (activeChildByParent[args.parentMessageId] === args.childMessageId) {
          return
        }
        activeChildByParent[args.parentMessageId] = args.childMessageId

        await tx.mutate.thread.update({
          id: thread.id,
          activeChildByParent,
          branchVersion: thread.branchVersion + 1,
        })
      },
    ),
    setMode: defineMutator(setThreadModeArgs, async ({ tx, args, ctx }) => {
      const thread = await tx.run(zql.thread.where('threadId', args.threadId).one())
      if (!thread || thread.userId !== ctx.userID) {
        return
      }

      const nextModeId = args.modeId ?? null
      const currentModeId =
        typeof thread.modeId === 'string' ? thread.modeId : null
      if (currentModeId === nextModeId) {
        return
      }

      await tx.mutate.thread.update({
        id: thread.id,
        modeId: nextModeId,
      })
    }),

    /**
     * Thread-local provider tool preferences are stored as disabled tool keys.
     * The mutator computes the canonical server-side value from the current
     * thread model/mode plus org policy so clients cannot bypass policy rules.
     */
    setDisabledToolKeys: defineMutator(
      setThreadDisabledToolKeysArgs,
      async ({ tx, args, ctx }) => {
        const thread = await tx.run(zql.thread.where('threadId', args.threadId).one())
        if (!thread || thread.userId !== ctx.userID) {
          return
        }

        const orgPolicyRow = ctx.organizationId
          ? await tx.run(
              zql.orgAiPolicy.where('organizationId', ctx.organizationId).one(),
            )
          : undefined
        const orgPolicy = buildOrgToolPolicy({
          organizationId: ctx.organizationId,
          policyRow: orgPolicyRow,
        })
        const mode = resolveEffectiveChatMode({
          orgEnforcedModeId: orgPolicy?.enforcedModeId,
          threadModeId: typeof thread.modeId === 'string' ? thread.modeId : undefined,
        })
        const nextDisabledToolKeys = sanitizeThreadDisabledToolKeys({
          modelId: thread.model,
          mode,
          orgPolicy,
          disabledToolKeys: args.disabledToolKeys,
        })

        const currentDisabledToolKeys = Array.isArray(thread.disabledToolKeys)
          ? thread.disabledToolKeys
          : []
        const same =
          currentDisabledToolKeys.length === nextDisabledToolKeys.length &&
          currentDisabledToolKeys.every(
            (value, index) => value === nextDisabledToolKeys[index],
          )
        if (same) {
          return
        }

        await tx.mutate.thread.update({
          id: thread.id,
          disabledToolKeys: nextDisabledToolKeys,
        })
      },
    ),
  },

  /**
   * No client-callable message mutators. Thread/message creation and
   * assistant finalization are done only by the chat backend via the
   * Zero DB adapter (direct tx.mutate), not via this HTTP mutator API.
   */
  messages: {},
}
