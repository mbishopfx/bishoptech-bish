'use client'

import { Form } from '@rift/ui/form'
import { canUseOrganizationProviderKeys } from '@/utils/app-feature-flags'
import { m } from '@/paraglide/messages.js'
import type { PolicyPayload } from './types'
import type { useProviderPolicy } from './use-provider-policy'

type ComplianceFlagsSectionProps = {
  payload: PolicyPayload
  updating: boolean
  update: ReturnType<typeof useProviderPolicy>['update']
}

/**
 * Compliance flags section: single Form card with toggleSection for flags
 * (e.g. require_zdr). Updates policy on toggle change.
 */
export function ComplianceFlagsSection({
  payload,
  updating,
  update,
}: ComplianceFlagsSectionProps) {
  const byokEnabled = canUseOrganizationProviderKeys()

  return (
    <Form
      title={m.org_compliance_flags_title()}
      description={m.org_compliance_flags_description()}
      helpText={m.org_compliance_flags_help()}
      toggleSection={{
        sectionTitle: m.org_compliance_flags_section_title(),
        items: [
          {
            id: 'require_zdr',
            title: m.org_compliance_flag_require_zdr_title(),
            description: m.org_compliance_flag_require_zdr_description(),
            checked: Boolean(payload.policy.complianceFlags.require_zdr),
            onCheckedChange: (enabled) =>
              void update({
                action: 'toggle_compliance_flag',
                flag: 'require_zdr',
                enabled,
              }),
            disabled: updating,
          },
          {
            id: 'require_org_provider_key',
            title: m.org_compliance_flag_require_org_provider_key_title(),
            description: m.org_compliance_flag_require_org_provider_key_description(),
            checked: Boolean(
              payload.policy.complianceFlags.require_org_provider_key,
            ),
            onCheckedChange: (enabled) =>
              void update({
                action: 'toggle_compliance_flag',
                flag: 'require_org_provider_key',
                enabled,
              }),
            disabled: updating || !byokEnabled,
          },
          {
            id: 'enforce_study_mode',
            title: m.org_compliance_flag_enforce_study_mode_title(),
            description: m.org_compliance_flag_enforce_study_mode_description(),
            checked: payload.policy.enforcedModeId === 'study',
            onCheckedChange: (enabled) =>
              void update({
                action: 'set_enforced_mode',
                modeId: enabled ? 'study' : null,
              }),
            disabled: updating,
          },
        ],
      }}
    />
  )
}
