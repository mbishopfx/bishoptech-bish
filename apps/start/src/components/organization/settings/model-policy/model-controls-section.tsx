'use client'

import { Form } from '@rift/ui/form'
import type { PolicyPayload } from './types'
import type { useProviderPolicy } from './use-provider-policy'

type ModelControlsSectionProps = {
  payload: PolicyPayload
  updating: boolean
  update: ReturnType<typeof useProviderPolicy>['update']
}

/**
 * Model controls section: Form card with toggleSection for each model.
 * Toggling disables or enables the model; shows denial reason when disabled elsewhere.
 */
export function ModelControlsSection({
  payload,
  updating,
  update,
}: ModelControlsSectionProps) {
  return (
    <Form
      title="Model Controls"
      description="Override model availability per model. Disabled by provider or compliance policy is shown in the description."
      helpText="Changes apply immediately. You can override a provider-level denial per model here."
      toggleSection={{
        sectionTitle: 'Models',
        items: payload.models.map((model) => ({
          id: model.id,
          title: model.name,
          description: [
            model.id,
            model.deniedBy.length > 0
              ? `Disabled by: ${model.deniedBy.join(', ')}`
              : null,
          ]
            .filter(Boolean)
            .join(' · '),
          checked: payload.policy.disabledModelIds.includes(model.id),
          onCheckedChange: (disabled) =>
            void update({
              action: 'toggle_model',
              modelId: model.id,
              disabled,
            }),
          disabled: updating,
        })),
      }}
    />
  )
}
