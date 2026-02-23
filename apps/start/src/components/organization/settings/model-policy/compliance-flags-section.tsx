'use client'

import { Form } from '@rift/ui/form'
import type { PolicyPayload } from './types'
import type { useProviderPolicy } from './use-provider-policy'

type ComplianceFlagsSectionProps = {
  payload: PolicyPayload
  updating: boolean
  update: ReturnType<typeof useProviderPolicy>['update']
}

/**
 * Compliance flags section: single Form card with toggleSection for flags
 * (e.g. block_data_collection). Updates policy on toggle change.
 */
export function ComplianceFlagsSection({
  payload,
  updating,
  update,
}: ComplianceFlagsSectionProps) {
  return (
    <Form
      title="Compliance Flags"
      description="Organization-level compliance toggles. Denied catalog models are not available for use."
      helpText="Changes apply immediately. Toggling off a flag re-allows previously denied models."
      toggleSection={{
        sectionTitle: 'Flags',
        items: [
          {
            id: 'block_data_collection',
            title: 'Block data-collection models',
            description: 'Denies catalog models with collectsData enabled.',
            checked: Boolean(payload.policy.complianceFlags.block_data_collection),
            onCheckedChange: (enabled) =>
              void update({
                action: 'toggle_compliance_flag',
                flag: 'block_data_collection',
                enabled,
              }),
            disabled: updating,
          },
        ],
      }}
    />
  )
}
