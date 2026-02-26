'use client'

import { useMemo, useState } from 'react'
import { Form } from '@rift/ui/form'
import { Button } from '@rift/ui/button'
import type { PolicyPayload } from './types'
import type { useProviderPolicy } from './use-provider-policy'

type ProviderApiKeysSectionProps = {
  payload: PolicyPayload
  updating: boolean
  update: ReturnType<typeof useProviderPolicy>['update']
}

/**
 * Renders BYOK controls for supported providers. API keys are written to
 * WorkOS Vault from the API route; this component only sends key updates.
 */
export function ProviderApiKeysSection({
  payload,
  updating,
  update,
}: ProviderApiKeysSectionProps) {
  const [openaiInput, setOpenaiInput] = useState('')
  const [anthropicInput, setAnthropicInput] = useState('')

  const featureEnabled = payload.featureFlags.enableOrganizationProviderKeys

  const cards = useMemo(
    () => [
      {
        providerId: 'openai' as const,
        title: 'OpenAI API Key',
        configured: payload.providerApiKeys.openai,
        value: openaiInput,
        setValue: setOpenaiInput,
        placeholder: 'sk-...',
      },
      {
        providerId: 'anthropic' as const,
        title: 'Anthropic API Key',
        configured: payload.providerApiKeys.anthropic,
        value: anthropicInput,
        setValue: setAnthropicInput,
        placeholder: 'sk-ant-...',
      },
    ],
    [
      anthropicInput,
      openaiInput,
      payload.providerApiKeys.anthropic,
      payload.providerApiKeys.openai,
    ],
  )

  if (!featureEnabled) {
    return (
      <Form
        title="Organization API Keys"
        description="Bring-your-own-provider-key is disabled for this environment."
        helpText="Set `ENABLE_ORGANIZATION_PROVIDER_KEYS=true` to enable WorkOS Vault-backed provider keys."
      />
    )
  }

  return (
    <section className="space-y-4">
      {cards.map((card) => (
        <div key={card.providerId} className="space-y-3">
          <Form
            title={card.title}
            description={
              card.configured
                ? 'Configured for this organization. New requests for this provider will use your org key.'
                : 'Not configured. Requests will continue using the system provider key unless policy blocks it.'
            }
            inputAttrs={{
              name: `${card.providerId}ApiKey`,
              type: 'password',
              placeholder: card.placeholder,
              autoComplete: 'off',
            }}
            value={card.value}
            onValueChange={card.setValue}
            buttonText={card.configured ? 'Rotate key' : 'Save key'}
            handleSubmit={async () => {
              await update({
                action: 'set_provider_api_key',
                providerId: card.providerId,
                apiKey: card.value,
              })
              card.setValue('')
            }}
          />

          {card.configured && (
            <Button
              type="button"
              variant="ghost"
              disabled={updating}
              onClick={() =>
                void update({
                  action: 'remove_provider_api_key',
                  providerId: card.providerId,
                })
              }
            >
              Remove {card.providerId} key
            </Button>
          )}
        </div>
      ))}
    </section>
  )
}
