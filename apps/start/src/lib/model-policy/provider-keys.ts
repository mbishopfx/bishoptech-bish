import { NotFoundException, WorkOS } from '@workos-inc/node'

export const BYOK_SUPPORTED_PROVIDERS = ['openai', 'anthropic'] as const

export type ByokSupportedProviderId = (typeof BYOK_SUPPORTED_PROVIDERS)[number]

export type OrgProviderKeyStatus = Record<ByokSupportedProviderId, boolean>

/**
 * Prefixes WorkOS Vault object names with a stable namespace
 */
const VAULT_OBJECT_PREFIX = 'rift:org-provider-ai-key'
const DEFAULT_PROVIDER_KEY_CACHE_TTL_MS = 30_000

let workosSingleton: WorkOS | undefined
const providerKeyCache = new Map<
  string,
  { readonly value: string | undefined; readonly expiresAt: number }
>()

function getWorkosClient(): WorkOS {
  if (workosSingleton) return workosSingleton
  workosSingleton = new WorkOS(process.env.WORKOS_API_KEY)
  return workosSingleton
}

function getVaultObjectName(input: {
  readonly orgWorkosId: string
  readonly providerId: ByokSupportedProviderId
}): string {
  return `${VAULT_OBJECT_PREFIX}:${input.orgWorkosId}:${input.providerId}`
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof NotFoundException
}

function normalizeKey(rawApiKey: string): string {
  return rawApiKey.trim()
}

function getCacheTtlMs(): number {
  const raw = process.env.ORG_PROVIDER_KEY_CACHE_TTL_MS
  const parsed = raw ? Number(raw) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PROVIDER_KEY_CACHE_TTL_MS
  }
  return parsed
}

function toCacheKey(input: {
  readonly orgWorkosId: string
  readonly providerId: ByokSupportedProviderId
}): string {
  return `${input.orgWorkosId}:${input.providerId}`
}

function readFromCache(input: {
  readonly orgWorkosId: string
  readonly providerId: ByokSupportedProviderId
}): string | undefined | null {
  const key = toCacheKey(input)
  const cached = providerKeyCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    providerKeyCache.delete(key)
    return null
  }
  return cached.value
}

function writeToCache(input: {
  readonly orgWorkosId: string
  readonly providerId: ByokSupportedProviderId
  readonly value: string | undefined
}): void {
  providerKeyCache.set(toCacheKey(input), {
    value: input.value,
    expiresAt: Date.now() + getCacheTtlMs(),
  })
}

function invalidateCache(input: {
  readonly orgWorkosId: string
  readonly providerId: ByokSupportedProviderId
}): void {
  providerKeyCache.delete(toCacheKey(input))
}

export function isByokSupportedProviderId(
  providerId: string,
): providerId is ByokSupportedProviderId {
  return (
    providerId === BYOK_SUPPORTED_PROVIDERS[0] ||
    providerId === BYOK_SUPPORTED_PROVIDERS[1]
  )
}

/**
 * Reads one provider key by org+provider. Returns undefined when no key exists.
 * Consumers should treat a returned key as highly sensitive and avoid logging it.
 */
export async function readOrgProviderApiKey(input: {
  readonly orgWorkosId: string
  readonly providerId: ByokSupportedProviderId
}): Promise<string | undefined> {
  const cached = readFromCache(input)
  if (cached !== null) return cached

  const workos = getWorkosClient()
  const objectName = getVaultObjectName(input)

  try {
    const object = await workos.vault.readObjectByName(objectName)
    writeToCache({
      orgWorkosId: input.orgWorkosId,
      providerId: input.providerId,
      value: object.value,
    })
    return object.value
  } catch (error) {
    if (isNotFoundError(error)) {
      writeToCache({
        orgWorkosId: input.orgWorkosId,
        providerId: input.providerId,
        value: undefined,
      })
      return undefined
    }
    throw error
  }
}

/**
 * Returns a lightweight configured/not-configured status map used by settings
 * UI and policy enforcement paths that only need key existence.
 */
export async function readOrgProviderApiKeyStatus(
  orgWorkosId: string,
): Promise<OrgProviderKeyStatus> {
  const statuses = await Promise.all(
    BYOK_SUPPORTED_PROVIDERS.map(async (providerId) => ({
      providerId,
      hasKey:
        (await readOrgProviderApiKey({
          orgWorkosId,
          providerId,
        })) != null,
    })),
  )

  return statuses.reduce(
    (acc, status) => {
      acc[status.providerId] = status.hasKey
      return acc
    },
    {
      openai: false,
      anthropic: false,
    } as OrgProviderKeyStatus,
  )
}

/**
 * Creates or updates the org-scoped provider API key in WorkOS Vault.
 * We use optimistic version checks on updates to avoid blind overwrite races.
 */
export async function upsertOrgProviderApiKey(input: {
  readonly orgWorkosId: string
  readonly providerId: ByokSupportedProviderId
  readonly apiKey: string
}): Promise<void> {
  invalidateCache({
    orgWorkosId: input.orgWorkosId,
    providerId: input.providerId,
  })

  const workos = getWorkosClient()
  const objectName = getVaultObjectName(input)
  const apiKey = normalizeKey(input.apiKey)
  if (apiKey.length === 0) {
    throw new Error('API key is required')
  }

  try {
    const existing = await workos.vault.readObjectByName(objectName)
    await workos.vault.updateObject({
      id: existing.id,
      value: apiKey,
      versionCheck: existing.metadata.versionId,
    })
    writeToCache({
      orgWorkosId: input.orgWorkosId,
      providerId: input.providerId,
      value: apiKey,
    })
    return
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
  }

  await workos.vault.createObject({
    name: objectName,
    value: apiKey,
    context: {
      orgWorkosId: input.orgWorkosId,
      providerId: input.providerId,
      feature: 'org_provider_ai_key',
    },
  })
  writeToCache({
    orgWorkosId: input.orgWorkosId,
    providerId: input.providerId,
    value: apiKey,
  })
}

/**
 * Deletes a provider key if present. Missing keys are treated as an idempotent
 * no-op so UI can call this repeatedly without introducing error states.
 */
export async function deleteOrgProviderApiKey(input: {
  readonly orgWorkosId: string
  readonly providerId: ByokSupportedProviderId
}): Promise<void> {
  invalidateCache({
    orgWorkosId: input.orgWorkosId,
    providerId: input.providerId,
  })

  const workos = getWorkosClient()
  const objectName = getVaultObjectName(input)

  try {
    const existing = await workos.vault.readObjectByName(objectName)
    await workos.vault.deleteObject({
      id: existing.id,
    })
    writeToCache({
      orgWorkosId: input.orgWorkosId,
      providerId: input.providerId,
      value: undefined,
    })
  } catch (error) {
    if (isNotFoundError(error)) {
      writeToCache({
        orgWorkosId: input.orgWorkosId,
        providerId: input.providerId,
        value: undefined,
      })
      return
    }
    throw error
  }
}
