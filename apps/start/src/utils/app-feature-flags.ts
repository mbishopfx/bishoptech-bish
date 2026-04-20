import { readPublicRuntimeEnv } from './public-runtime-env'

/**
 * App-level feature flags.
 *
 * Uses VITE_ prefixed env vars so both client and server can use the same
 * environment variable.
 */
type AppFeatureFlags = {
  readonly instanceMode: 'cloud' | 'self_hosted'
  readonly selfHostSource: string
  readonly enableEmbedding: boolean
  readonly enableReasoningControls: boolean
  readonly enableAdvancedProviderTools: boolean
  readonly enableOrganizationProviderKeys: boolean
  readonly exposeUserCost: boolean
  readonly disableRedis: boolean
}

function readBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = readPublicRuntimeEnv(
    key as
      | 'VITE_BETTER_AUTH_URL'
      | 'VITE_APP_INSTANCE_MODE'
      | 'VITE_SELF_HOST_SOURCE'
      | 'VITE_ZERO_CACHE_URL',
  )
  if (value === 'true') return true
  if (value === 'false') return false
  return defaultValue
}

const APP_INSTANCE_MODE: 'cloud' | 'self_hosted' =
  readPublicRuntimeEnv('VITE_APP_INSTANCE_MODE') === 'self_hosted'
    ? 'self_hosted'
    : 'cloud'

const APP_FEATURE_FLAGS: AppFeatureFlags = Object.freeze({
  instanceMode: APP_INSTANCE_MODE,
  selfHostSource: (readPublicRuntimeEnv('VITE_SELF_HOST_SOURCE') ?? '')
    .trim()
    .toLowerCase(),
  enableEmbedding: readBooleanEnv('VITE_ENABLE_EMBEDDING', true),
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
export const appInstanceMode = APP_FEATURE_FLAGS.instanceMode
export const selfHostSource = APP_FEATURE_FLAGS.selfHostSource
export const isSelfHosted = APP_FEATURE_FLAGS.instanceMode === 'self_hosted'
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
