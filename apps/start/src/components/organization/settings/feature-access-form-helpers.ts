'use client'

import {
  getFeatureAccessAction
  
} from '@/lib/shared/access-control'
import type {WorkspaceFeatureAccessState} from '@/lib/shared/access-control';
import {
  getLocalizedFeatureAccessActionLabel,
  getLocalizedFeatureAccessGateMessage,
} from '@/lib/frontend/access-control'

type FeatureAccessInput = {
  enabled: boolean
  featureAccess?: WorkspaceFeatureAccessState & { loading: boolean }
  defaultHelpText?: string
}

/**
 * Small helper for settings forms that need either their normal help copy or
 * the locked-feature upgrade/contact copy. Uses translated strings for all
 * user-facing messages.
 */
export function getFeatureAccessFormProps(input: FeatureAccessInput) {
  if (input.enabled || !input.featureAccess) {
    return {
      helpText: input.defaultHelpText,
      helpLearnMoreHref: undefined,
      helpLearnMoreLabel: undefined,
      featureDisabled: false,
    }
  }

  const action = getFeatureAccessAction(input.featureAccess.minimumPlanId)

  return {
    helpText: getLocalizedFeatureAccessGateMessage(input.featureAccess.minimumPlanId),
    helpLearnMoreHref: action.href,
    helpLearnMoreLabel: getLocalizedFeatureAccessActionLabel(input.featureAccess.minimumPlanId),
    featureDisabled: true,
  }
}
