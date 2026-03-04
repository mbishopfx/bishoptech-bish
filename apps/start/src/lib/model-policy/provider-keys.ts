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
 * BYOK is intentionally disabled for this migration.
 */
export async function readOrgProviderApiKey(_input: {
  readonly organizationId: string
  readonly providerId: ByokSupportedProviderId
}): Promise<string | undefined> {
  return undefined
}

/**
 * Returns an all-false status map while BYOK is disabled.
 */
export async function readOrgProviderApiKeyStatus(
  _organizationId: string,
): Promise<OrgProviderKeyStatus> {
  return {
    openai: false,
    anthropic: false,
  }
}

export async function upsertOrgProviderApiKey(_input: {
  readonly organizationId: string
  readonly providerId: ByokSupportedProviderId
  readonly apiKey: string
}): Promise<void> {
  throw new Error('BYOK is disabled')
}

export async function deleteOrgProviderApiKey(_input: {
  readonly organizationId: string
  readonly providerId: ByokSupportedProviderId
}): Promise<void> {
  throw new Error('BYOK is disabled')
}
