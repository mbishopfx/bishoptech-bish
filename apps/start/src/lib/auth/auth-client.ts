import { createAuthClient } from 'better-auth/react'
import { stripeClient } from '@better-auth/stripe/client'
import {
  anonymousClient,
  emailOTPClient,
  multiSessionClient,
  organizationClient,
} from 'better-auth/client/plugins'
import { twoFactorClient } from 'better-auth/client/plugins'

function resolveAuthClientBaseURL(): string {
  const raw = import.meta.env.VITE_BETTER_AUTH_URL?.trim()
  if (!raw) {
    throw new Error(
      'Missing VITE_BETTER_AUTH_URL. Set it to app origin (for example http://localhost:3000).',
    )
  }

  const origin = raw.replace(/\/+$/, '')
  return `${origin}/api/auth`
}

const baseURL = resolveAuthClientBaseURL()

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    stripeClient({
      subscription: true,
    }),
    anonymousClient(),
    multiSessionClient(),
    twoFactorClient(),
    emailOTPClient(),
  ],
})

export type AppSession = typeof authClient.$Infer.Session
