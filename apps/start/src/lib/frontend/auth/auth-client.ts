import { createAuthClient } from 'better-auth/react'
import { stripeClient } from '@better-auth/stripe/client'
import {
  anonymousClient,
  emailOTPClient,
  multiSessionClient,
  organizationClient, twoFactorClient 
} from 'better-auth/client/plugins'
import {
  isGuestAccessEnabled,
  isSelfHosted,
} from '@/utils/app-feature-flags'
import { readPublicRuntimeEnv } from '@/utils/public-runtime-env'

function resolveAuthClientBaseURL(): string {
  const trimTrailingSlash = (s: string) => s.replace(/\/+$/, '')

  if (typeof window === 'undefined') {
    // Test environments import this module without a browser origin. Falling
    // back to localhost keeps client-only hooks importable in unit tests while
    // production and server environments still require explicit configuration.
    const raw =
      process.env.BETTER_AUTH_URL?.trim() ||
      (process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : '')
    if (!raw) {
      throw new Error(
        'Missing BETTER_AUTH_URL. Set it to the app origin (for example https://app.example.com).',
      )
    }
    return `${trimTrailingSlash(raw)}/api/auth`
  }

  const raw = readPublicRuntimeEnv('VITE_BETTER_AUTH_URL') || window.location.origin
  return `${trimTrailingSlash(raw)}/api/auth`
}

const baseURL = resolveAuthClientBaseURL()

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    ...(!isSelfHosted
      ? [
          stripeClient({
            subscription: true,
          }),
        ]
      : []),
    ...(!isSelfHosted && isGuestAccessEnabled ? [anonymousClient()] : []),
    multiSessionClient(),
    twoFactorClient(),
    ...(!isSelfHosted ? [emailOTPClient()] : []),
  ],
})

export type AppSession = typeof authClient.$Infer.Session
