import { m } from '@/paraglide/messages.js'
import { isSelfHosted } from '@/utils/app-feature-flags'
import { useOrgBillingSummary } from '@/lib/frontend/billing/use-org-billing'
import {
  coerceWorkspacePlanId,
  getWorkspacePlan,
} from '@/lib/shared/access-control'

function formatMemberCountLabel(memberCount: number | null): string {
  if (memberCount == null) {
    return ''
  }

  return memberCount === 1
    ? m.layout_organization_member_count_one()
    : m.layout_organization_member_count_other({ count: memberCount })
}

export function SidebarOrganizationBillingSummary() {
  if (isSelfHosted) {
    return 'Self-hosted'
  }

  const { entitlement, loading } = useOrgBillingSummary()

  if (loading && !entitlement?.planId) {
    return null
  }

  const plan = getWorkspacePlan(coerceWorkspacePlanId(entitlement?.planId))
  const memberCountLabel = formatMemberCountLabel(
    entitlement?.activeMemberCount ?? null,
  )

  return memberCountLabel ? `${plan.name} · ${memberCountLabel}` : plan.name
}
