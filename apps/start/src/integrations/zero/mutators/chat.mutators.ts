import {
  defineMutator,
} from '@rocicorp/zero'
import { z } from 'zod'
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
  },

  /**
   * No client-callable message mutators. Thread/message creation and
   * assistant finalization are done only by the chat backend via the
   * Zero DB adapter (direct tx.mutate), not via this HTTP mutator API.
   */
  messages: {},
}
