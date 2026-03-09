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

function ZdrComplianceForm({
  payload,
  updating,
  update,
}: ComplianceFlagsSectionProps) {
  return (
    <Form
      title={m.org_compliance_flag_require_zdr_title()}
      description={m.org_compliance_flag_require_zdr_description()}
      headerToggle={{
        checked: Boolean(payload.policy.complianceFlags.require_zdr),
        onCheckedChange: (enabled) =>
          void update({
            action: 'toggle_compliance_flag',
            flag: 'require_zdr',
            enabled,
          }),
        disabled: updating,
      }}
      helpText={m.org_compliance_flags_help()}
    />
  )
}

function RequireOrgProviderKeyForm({
  payload,
  updating,
  update,
}: ComplianceFlagsSectionProps) {
  const byokEnabled = canUseOrganizationProviderKeys()

  return (
    <Form
      title={m.org_compliance_flag_require_org_provider_key_title()}
      description={m.org_compliance_flag_require_org_provider_key_description()}
      headerToggle={{
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
      }}
      helpText={m.org_compliance_flags_help()}
    />
  )
}

function EnforceStudyModeForm({
  payload,
  updating,
  update,
}: ComplianceFlagsSectionProps) {
  return (
    <Form
      title={m.org_compliance_flag_enforce_study_mode_title()}
      description={m.org_compliance_flag_enforce_study_mode_description()}
      headerToggle={{
        checked: payload.policy.enforcedModeId === 'study',
        onCheckedChange: (enabled) =>
          void update({
            action: 'set_enforced_mode',
            modeId: enabled ? 'study' : null,
          }),
        disabled: updating,
      }}
      helpText={m.org_compliance_flags_help()}
    />
  )
}

export function ComplianceFlagsSection({
  payload,
  updating,
  update,
}: ComplianceFlagsSectionProps) {
  return (
    <div className="space-y-6">
      <ZdrComplianceForm payload={payload} updating={updating} update={update} />
      <RequireOrgProviderKeyForm
        payload={payload}
        updating={updating}
        update={update}
      />
      <EnforceStudyModeForm
        payload={payload}
        updating={updating}
        update={update}
      />
    </div>
  )
}
