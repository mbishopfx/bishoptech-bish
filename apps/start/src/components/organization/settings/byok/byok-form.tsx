'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@rift/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@rift/ui/dialog'
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
  requireZdr: boolean
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
  requireZdr,
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
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    providerId: ByokProvider
    apiKey: string
  } | null>(null)
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

  async function saveProviderKey(input: {
    readonly providerId: ByokProvider
    readonly apiKey: string
  }) {
    await onSave(input.providerId, input.apiKey)
    if (input.providerId === 'openai') {
      setOpenaiInput(input.apiKey ? MASKED_KEY_VALUE : '')
      return
    }

    setAnthropicInput(input.apiKey ? MASKED_KEY_VALUE : '')
  }

  return (
    <>
      <Dialog
        open={pendingConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingConfirmation(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{m.org_byok_zdr_dialog_title()}</DialogTitle>
            <DialogDescription>
              {pendingConfirmation
                ? m.org_byok_zdr_dialog_description({
                    providerName: getProviderName(pendingConfirmation.providerId),
                  })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPendingConfirmation(null)
              }}
            >
              {m.common_cancel()}
            </Button>
            <Button
              onClick={async () => {
                if (!pendingConfirmation) return
                const confirmed = pendingConfirmation
                setPendingConfirmation(null)
                try {
                  await saveProviderKey(confirmed)
                } catch {
                  // Keep the user-entered key in the input so it can be retried.
                }
              }}
            >
              {m.org_byok_zdr_dialog_confirm_button()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                        if (requireZdr) {
                          setPendingConfirmation({
                            providerId: card.providerId,
                            apiKey: key,
                          })
                        } else {
                          await saveProviderKey({
                            providerId: card.providerId,
                            apiKey: key,
                          })
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
    </>
  )
}
