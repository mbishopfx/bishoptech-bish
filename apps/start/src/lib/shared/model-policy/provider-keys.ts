export const BYOK_SUPPORTED_PROVIDERS = ['openai', 'anthropic'] as const

export type ByokSupportedProviderId = (typeof BYOK_SUPPORTED_PROVIDERS)[number]

export type OrgProviderKeyStatus = Record<ByokSupportedProviderId, boolean>

export function isByokSupportedProviderId(
  providerId: string,
): providerId is ByokSupportedProviderId {
  return (
    providerId === BYOK_SUPPORTED_PROVIDERS[0] ||
    providerId === BYOK_SUPPORTED_PROVIDERS[1]
  )
}

/**
 * Basic provider key format guardrails:
 * - OpenAI keys start with `sk-`
 * - Anthropic keys start with `sk-ant-`
 */
export function validateProviderApiKeyFormat(input: {
  readonly providerId: ByokSupportedProviderId
  readonly apiKey: string
}): { readonly ok: boolean; readonly normalizedApiKey: string; readonly message?: string } {
  const normalizedApiKey = input.apiKey.trim()

  if (normalizedApiKey.length === 0) {
    return {
      ok: false,
      normalizedApiKey,
      message: 'Provider API key is required.',
    }
  }

  if (input.providerId === 'openai') {
    return normalizedApiKey.startsWith('sk-')
      ? { ok: true, normalizedApiKey }
      : {
          ok: false,
          normalizedApiKey,
          message: 'OpenAI API keys must start with "sk-".',
        }
  }

  return normalizedApiKey.startsWith('sk-ant-')
    ? { ok: true, normalizedApiKey }
    : {
        ok: false,
        normalizedApiKey,
        message: 'Anthropic API keys must start with "sk-ant-".',
      }
}
