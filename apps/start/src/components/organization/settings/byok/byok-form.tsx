'use client'

import { useEffect, useMemo, useState } from 'react'
import { Form } from '@rift/ui/form'
import {
  getFeatureAccessAction
  
} from '@/lib/shared/access-control'
import type {WorkspaceFeatureAccessState} from '@/lib/shared/access-control';
import {
  getLocalizedFeatureAccessActionLabel,
  getLocalizedFeatureAccessGateMessage,
} from '@/lib/frontend/access-control'
import { getFeatureAccessFormProps } from '@/components/organization/settings/feature-access-form-helpers'
import type { ByokProvider } from '@/lib/shared/byok/types'
import { m } from '@/paraglide/messages.js'

function getProviderApiKeyHref(providerId: ByokProvider): string {
  return providerId === 'openai'
    ? 'https://platform.openai.com/api-keys'
    : 'https://console.anthropic.com/settings/keys'
}

function getProviderName(providerId: ByokProvider): string {
  return providerId === 'openai' ? 'OpenAI' : 'Anthropic'
}

interface ProviderCard {
  providerId: ByokProvider
  title: string
  configured: boolean
  placeholder: string
}

interface ByokFormProps {
  featureAccess: WorkspaceFeatureAccessState & { loading: boolean }
  providerKeyStatus: {
    openai: boolean
    anthropic: boolean
  }
  errorByProvider: {
    openai: string | null
    anthropic: string | null
  }
  successByProvider: {
    openai: string | null
    anthropic: string | null
  }
  loading: boolean
  updatingByProvider: {
    openai: boolean
    anthropic: boolean
  }
  onSave: (providerId: ByokProvider, apiKey: string) => Promise<void>
  onRemove: (providerId: ByokProvider) => Promise<void>
}

/**
 * Form for configuring BYOK (Bring Your Own Key) per provider.
 * Renders a card per provider (OpenAI, Anthropic) with save/update/remove actions.
 */
// Masked value to show in input when a key is already configured
const MASKED_KEY_VALUE = '••••••••••••••••••••••••••••••'

export function ByokForm({
  featureAccess,
  providerKeyStatus,
  errorByProvider,
  successByProvider,
  loading,
  updatingByProvider,
  onSave,
  onRemove,
}: ByokFormProps) {
  const featureEnabled = featureAccess.allowed
  const featureAction = getFeatureAccessAction(featureAccess.minimumPlanId)
  const [openaiInput, setOpenaiInput] = useState(() =>
    providerKeyStatus.openai ? MASKED_KEY_VALUE : '',
  )
  const [anthropicInput, setAnthropicInput] = useState(() =>
    providerKeyStatus.anthropic ? MASKED_KEY_VALUE : '',
  )

  // Sync state when providerKeyStatus changes (e.g., after remove)
  useEffect(() => {
    setOpenaiInput((current) =>
      providerKeyStatus.openai
        ? current === ''
          ? MASKED_KEY_VALUE
          : current
        : '',
    )
    setAnthropicInput((current) =>
      providerKeyStatus.anthropic
        ? current === ''
          ? MASKED_KEY_VALUE
          : current
        : '',
    )
  }, [providerKeyStatus.openai, providerKeyStatus.anthropic])

  const cards = useMemo<ProviderCard[]>(
    () => [
      {
        providerId: 'openai' as const,
        title: 'OpenAI API Key',
        configured: providerKeyStatus.openai,
        placeholder: 'sk-...',
      },
      {
        providerId: 'anthropic' as const,
        title: 'Anthropic API Key',
        configured: providerKeyStatus.anthropic,
        placeholder: 'sk-ant-...',
      },
    ],
    [providerKeyStatus],
  )

  return (
    <section className="space-y-6">
      {cards.map((card) => {
        /**
         * Error state is isolated per provider card so failures in one
         * provider mutation do not mark other provider inputs as invalid.
         */
        const cardError = errorByProvider[card.providerId]
        const cardSuccess = successByProvider[card.providerId]
        const cardUpdating = updatingByProvider[card.providerId]

        return (
          <div key={card.providerId} className="space-y-3">
          <Form
            title={card.title}
            description={
              !featureEnabled
                ? getLocalizedFeatureAccessGateMessage(featureAccess.minimumPlanId)
                : card.configured
                ? m.org_byok_provider_configured_description()
                : m.org_byok_provider_not_configured_description()
            }
            {...getFeatureAccessFormProps({
              enabled: featureEnabled,
              featureAccess,
              defaultHelpText: m.org_byok_api_key_help_prefix({
                providerName: getProviderName(card.providerId),
              }),
            })}
            inputAttrs={{
              name: `${card.providerId}ApiKey`,
              type: 'password',
              placeholder: card.placeholder,
              autoComplete: 'off',
              disabled: loading || cardUpdating || !featureEnabled || card.configured,
              'aria-invalid': cardError ? true : undefined,
              className:
                '[&::-webkit-credentials-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:w-0 [&::-ms-reveal]:hidden',
            }}
            error={cardError}
            success={cardSuccess}
            value={card.providerId === 'openai' ? openaiInput : anthropicInput}
            onValueChange={
              featureEnabled
                ? (value) => {
                    const setter =
                      card.providerId === 'openai'
                        ? setOpenaiInput
                        : setAnthropicInput
                    // Clear masked value when user starts typing
                    const currentValue =
                      card.providerId === 'openai'
                        ? openaiInput
                        : anthropicInput
                    if (currentValue === MASKED_KEY_VALUE) {
                      setter(value.replace(MASKED_KEY_VALUE, ''))
                    } else {
                      setter(value)
                    }
                  }
                : undefined
            }
            buttonText={
              card.configured
                ? m.org_byok_remove_key_button()
                : m.org_byok_save_key_button()
            }
            buttonVariant={card.configured ? 'dangerLight' : 'default'}
            buttonDisabled={!featureEnabled || loading || cardUpdating}
            handleSubmit={
              featureEnabled
                ? async () => {
                    if (card.configured) {
                      // Remove the configured key
                      if (card.providerId === 'openai') {
                        setOpenaiInput('')
                      } else {
                        setAnthropicInput('')
                      }
                      try {
                        await onRemove(card.providerId)
                      } catch {
                        // Restore masked placeholder when removal fails.
                        if (card.providerId === 'openai') {
                          setOpenaiInput(MASKED_KEY_VALUE)
                        } else {
                          setAnthropicInput(MASKED_KEY_VALUE)
                        }
                      }
                    } else {
                      // Save new key
                      const rawKey =
                        card.providerId === 'openai'
                          ? openaiInput
                          : anthropicInput
                      // Don't send the masked placeholder value to the server
                      const key = rawKey === MASKED_KEY_VALUE ? '' : rawKey
                      try {
                        await onSave(card.providerId, key)
                        // After successful save, show masked value again if key was saved
                        if (card.providerId === 'openai') {
                          setOpenaiInput(key ? MASKED_KEY_VALUE : '')
                        } else {
                          setAnthropicInput(key ? MASKED_KEY_VALUE : '')
                        }
                      } catch {
                        // Keep user-typed value on failed save so they can correct/resubmit.
                      }
                    }
                  }
                : undefined
            }
            helpLearnMoreHref={
              featureEnabled
                ? getProviderApiKeyHref(card.providerId)
                : featureAction.href
            }
            helpLearnMoreLabel={
              featureEnabled
                ? m.org_byok_api_key_help_link_text()
                : getLocalizedFeatureAccessActionLabel(featureAccess.minimumPlanId)
            }
          />
          </div>
        )
      })}
    </section>
  )
}
