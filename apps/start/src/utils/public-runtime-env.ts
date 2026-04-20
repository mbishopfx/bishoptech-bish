const PUBLIC_RUNTIME_ENV_KEYS = [
  'VITE_BETTER_AUTH_URL',
  'VITE_APP_INSTANCE_MODE',
  'VITE_SELF_HOST_SOURCE',
  'VITE_ZERO_CACHE_URL',
] as const

type PublicRuntimeEnvKey = (typeof PUBLIC_RUNTIME_ENV_KEYS)[number]

type PublicRuntimeEnv = Partial<Record<PublicRuntimeEnvKey, string>>

declare global {
  interface Window {
    __BISH_PUBLIC_ENV__?: PublicRuntimeEnv
  }
}

function readBuildTimeEnv(key: PublicRuntimeEnvKey): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key]
}

/**
 * Reads a public runtime variable from the best available source for the
 * current execution environment:
 *
 * - client hydration/runtime: the bootstrap script injected into the document
 * - server rendering/runtime: process.env from the deployed host
 * - local builds/tests: Vite's import.meta.env fallback
 */
export function readPublicRuntimeEnv(
  key: PublicRuntimeEnvKey,
): string | undefined {
  if (typeof window !== 'undefined') {
    return window.__BISH_PUBLIC_ENV__?.[key]?.trim() || readBuildTimeEnv(key)
  }

  return process.env[key]?.trim() || readBuildTimeEnv(key)
}

export function getPublicRuntimeEnvSnapshot(): PublicRuntimeEnv {
  const snapshot: PublicRuntimeEnv = {}

  for (const key of PUBLIC_RUNTIME_ENV_KEYS) {
    const value = readPublicRuntimeEnv(key)
    if (value) {
      snapshot[key] = value
    }
  }

  return snapshot
}

/**
 * Serializes the runtime env snapshot into a safe inline bootstrap script so
 * client-side modules can read Railway/Vercel-hosted env values after SSR.
 */
export function buildPublicRuntimeEnvScript(snapshot: PublicRuntimeEnv): string {
  return `window.__BISH_PUBLIC_ENV__ = ${JSON.stringify(snapshot).replace(
    /</g,
    '\\u003c',
  )};`
}
