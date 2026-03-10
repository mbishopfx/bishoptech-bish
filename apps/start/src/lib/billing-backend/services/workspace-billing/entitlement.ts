import { ensureOrganizationBillingBaseline } from '@/lib/auth/default-organization'
import {
  readCurrentOrgSubscription,
  readOrganizationMemberCounts,
  upsertEntitlementSnapshot,
} from './persistence'
import type { OrgSeatAvailability } from './types'

export async function recomputeEntitlementSnapshotRecord(
  organizationId: string,
): Promise<OrgSeatAvailability> {
  await ensureOrganizationBillingBaseline(organizationId)

  const counts = await readOrganizationMemberCounts(organizationId)
  const currentSubscription = await readCurrentOrgSubscription(organizationId)

  return upsertEntitlementSnapshot({
    organizationId,
    currentSubscription,
    counts,
  })
}
