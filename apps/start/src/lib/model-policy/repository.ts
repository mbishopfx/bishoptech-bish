import { getZeroDatabase, zql } from '@/lib/chat-backend/infra/zero/db'
import { isChatModeId, type ChatModeId } from '@/lib/chat-modes'
import {
  EMPTY_ORG_PROVIDER_KEY_STATUS,
  type OrgAiPolicy,
  type OrgProviderKeyStatusSnapshot,
} from './types'

/** Uses epoch milliseconds to align with existing Zero schema timestamp columns. */
function now() {
  return Date.now()
}

/**
 * Normalizes partially populated DB rows into a fully shaped policy object.
 * This keeps policy consumers free from null/undefined branching.
 */
function fromRow(row: {
  readonly orgWorkosId: string
  readonly disabledProviderIds?: readonly string[]
  readonly disabledModelIds?: readonly string[]
  readonly complianceFlags?: Record<string, boolean>
  readonly providerKeyStatus?: OrgProviderKeyStatusSnapshot
  readonly enforcedModeId?: string | null
  readonly updatedAt?: number
}): OrgAiPolicy {
  const enforcedModeId = row.enforcedModeId
  const normalizedModeId =
    typeof enforcedModeId === 'string' && isChatModeId(enforcedModeId)
      ? enforcedModeId
      : undefined

  const providerKeyStatus = row.providerKeyStatus
    ? {
      syncedAt: row.providerKeyStatus.syncedAt ?? 0,
      hasAnyProviderKey: Boolean(row.providerKeyStatus.hasAnyProviderKey),
      providers: {
        openai: Boolean(row.providerKeyStatus.providers?.openai),
        anthropic: Boolean(row.providerKeyStatus.providers?.anthropic),
      },
    }
    : EMPTY_ORG_PROVIDER_KEY_STATUS

  return {
    orgWorkosId: row.orgWorkosId,
    disabledProviderIds: row.disabledProviderIds ?? [],
    disabledModelIds: row.disabledModelIds ?? [],
    complianceFlags: row.complianceFlags ?? {},
    providerKeyStatus,
    enforcedModeId: normalizedModeId,
    updatedAt: row.updatedAt ?? now(),
  }
}

/** Loads the latest policy snapshot for an org. */
export async function getOrgAiPolicy(
  orgWorkosId: string,
): Promise<OrgAiPolicy | undefined> {
  const db = getZeroDatabase()
  if (!db) {
    throw new Error('ZERO_UPSTREAM_DB is not configured')
  }

  const row = await db.run(
    zql.orgAiPolicy.where('orgWorkosId', orgWorkosId).one(),
  )

  if (!row) return undefined
  return fromRow(row)
}

/**
 * Inserts or updates org policy. No versioning; policy is overwritten on each update.
 */
export async function upsertOrgAiPolicy(input: {
  readonly orgWorkosId: string
  readonly disabledProviderIds: readonly string[]
  readonly disabledModelIds: readonly string[]
  readonly complianceFlags: Record<string, boolean>
  readonly providerKeyStatus: OrgProviderKeyStatusSnapshot
  readonly enforcedModeId?: ChatModeId | null
}): Promise<OrgAiPolicy> {
  const db = getZeroDatabase()
  if (!db) {
    throw new Error('ZERO_UPSTREAM_DB is not configured')
  }

  const existing = await db.run(
    zql.orgAiPolicy.where('orgWorkosId', input.orgWorkosId).one(),
  )

  const updatedAt = now()

  if (!existing) {
    const insertedId = crypto.randomUUID()
    await db.transaction(async (tx) => {
      await tx.mutate.orgAiPolicy.insert({
        id: insertedId,
        orgWorkosId: input.orgWorkosId,
        disabledProviderIds: [...input.disabledProviderIds],
        disabledModelIds: [...input.disabledModelIds],
        complianceFlags: input.complianceFlags,
        providerKeyStatus: input.providerKeyStatus,
        enforcedModeId: input.enforcedModeId ?? null,
        updatedAt,
      })
    })

    return {
      orgWorkosId: input.orgWorkosId,
      disabledProviderIds: [...input.disabledProviderIds],
      disabledModelIds: [...input.disabledModelIds],
      complianceFlags: input.complianceFlags,
      providerKeyStatus: input.providerKeyStatus,
      enforcedModeId: input.enforcedModeId ?? undefined,
      updatedAt,
    }
  }

  await db.transaction(async (tx) => {
    await tx.mutate.orgAiPolicy.update({
      id: existing.id,
      disabledProviderIds: [...input.disabledProviderIds],
      disabledModelIds: [...input.disabledModelIds],
      complianceFlags: input.complianceFlags,
      providerKeyStatus: input.providerKeyStatus,
      enforcedModeId: input.enforcedModeId ?? null,
      updatedAt,
    })
  })

  return {
    orgWorkosId: input.orgWorkosId,
    disabledProviderIds: [...input.disabledProviderIds],
    disabledModelIds: [...input.disabledModelIds],
    complianceFlags: input.complianceFlags,
    providerKeyStatus: input.providerKeyStatus,
    enforcedModeId: input.enforcedModeId ?? undefined,
    updatedAt,
  }
}
