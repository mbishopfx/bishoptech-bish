/**
 * App-level feature flags.
 *
 * Uses VITE_ prefixed env vars so both client and server can use the same
 * environment variable. This simplifies self-hosting - users only need to
 * set one env var per feature.
 */
type AppFeatureFlags = {
  readonly enableEmbedding: boolean
  readonly enableReasoningControls: boolean
  readonly enableAdvancedProviderTools: boolean
  readonly enableOrganizationProviderKeys: boolean
  readonly exposeUserCost: boolean
  readonly disableRedis: boolean
}

/**
 * Reads a boolean value from import.meta.env.
 * Works for both client (Vite build) and server (Nitro build).
 * Only VITE_ prefixed vars are exposed to the client.
 */
function readBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  if (value === 'true') return true
  if (value === 'false') return false
  return defaultValue
}

const APP_FEATURE_FLAGS: AppFeatureFlags = Object.freeze({
  enableEmbedding: readBooleanEnv('ENABLE_EMBEDDING', true),
  enableReasoningControls: true,
  enableAdvancedProviderTools: true,
  enableOrganizationProviderKeys: readBooleanEnv(
    'VITE_ENABLE_ORGANIZATION_PROVIDER_KEYS',
    false,
  ),
  exposeUserCost:
    typeof process !== 'undefined'
      ? process.env.ALLOW_USER_COST_DISPLAY === 'true'
      : false,
  disableRedis: readBooleanEnv('VITE_DISABLE_REDIS', false),
})

/**
 * Frozen, startup-resolved feature flag snapshot.
 * Import constants derived from this object to avoid call-site drift.
 */
export const APP_FEATURES = APP_FEATURE_FLAGS
export const isEmbeddingFeatureEnabled = APP_FEATURE_FLAGS.enableEmbedding
export const canUseReasoningControls =
  APP_FEATURE_FLAGS.enableReasoningControls
export const canUseAdvancedProviderTools =
  APP_FEATURE_FLAGS.enableAdvancedProviderTools
export const canUseOrganizationProviderKeys =
  APP_FEATURE_FLAGS.enableOrganizationProviderKeys
export const canExposeUserCost = APP_FEATURE_FLAGS.exposeUserCost
export const isRedisDisabled = APP_FEATURE_FLAGS.disableRedis

export function getAppFeatureFlags(): AppFeatureFlags {
  return APP_FEATURE_FLAGS
}
