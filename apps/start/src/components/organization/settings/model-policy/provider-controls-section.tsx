'use client'

import { Form } from '@rift/ui/form'
import type { PolicyPayload } from './types'
import type { useProviderPolicy } from './use-provider-policy'

type ProviderControlsSectionProps = {
  payload: PolicyPayload
  updating: boolean
  update: ReturnType<typeof useProviderPolicy>['update']
}

/**
 * Provider controls section: Form card with toggleSection listing each provider.
 * Toggling disables or enables the provider for the organization.
 */
export function ProviderControlsSection({
  payload,
  updating,
  update,
}: ProviderControlsSectionProps) {
  return (
    <Form
      title="Provider Controls"
      description="Enable or disable entire providers for your organization. Disabled providers hide all their models."
      helpText="Changes apply immediately. Disabling a provider hides all its models for this organization."
      toggleSection={{
        sectionTitle: 'Providers',
        items: payload.providers.map((provider) => ({
          id: provider.id,
          title: provider.id,
          description: provider.disabled ? 'Disabled for this organization.' : 'Enabled.',
          checked: provider.disabled,
          onCheckedChange: (disabled) =>
            void update({
              action: 'toggle_provider',
              providerId: provider.id,
              disabled,
            }),
          disabled: updating,
        })),
      }}
    />
  )
}
