'use client'

import { m } from '@/paraglide/messages.js'
import {
  getMinimumPlanName,
  getFeatureAccessAction
  
} from '@/lib/shared/access-control'
import type {PaidWorkspacePlanId} from '@/lib/shared/access-control';

/**
 * Client-facing access copy is localized here so the shared access catalog can
 * stay focused on plan rules instead of UI strings.
 */
export function getLocalizedFeatureAccessGateMessage(
  minimumPlanId: PaidWorkspacePlanId,
): string {
  return m.feature_access_requires_plan({
    planName: getMinimumPlanName(minimumPlanId),
  })
}

export function getLocalizedFeatureAccessActionLabel(
  minimumPlanId: PaidWorkspacePlanId,
): string {
  const action = getFeatureAccessAction(minimumPlanId)
  const planName = getMinimumPlanName(minimumPlanId)

  return action.kind === 'contact'
    ? m.feature_access_contact_label()
    : m.feature_access_upgrade_label({ planName })
}
