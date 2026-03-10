import { authPool } from '@/lib/auth/auth-pool'
import {
  ensureCurrentCycleSeatScaffolding,
  readCurrentUsageSubscription,
  resolveEffectiveUsagePolicyRecord,
} from './policy-store'
import { ensureSeatAssignmentWithClient } from './seat-store'
import type { SeatQuotaState } from './types'

export async function ensureSeatAssignmentRecord(input: {
  readonly organizationId: string
  readonly userId: string
}): Promise<SeatQuotaState | null> {
  const client = await authPool.connect()
  const now = Date.now()

  try {
    await client.query('BEGIN')
    const currentSubscription = await readCurrentUsageSubscription(client, input.organizationId)
    const usagePolicy = await resolveEffectiveUsagePolicyRecord({
      organizationId: input.organizationId,
      currentSubscription,
      client,
    })
    await ensureCurrentCycleSeatScaffolding(client, {
      organizationId: input.organizationId,
      currentSubscription,
      usagePolicy,
      now,
    })
    const assigned = await ensureSeatAssignmentWithClient(client, {
      organizationId: input.organizationId,
      userId: input.userId,
      currentSubscription,
      usagePolicy,
      now,
    })
    await client.query('COMMIT')
    return assigned
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
