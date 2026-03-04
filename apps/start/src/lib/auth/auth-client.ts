import { createAuthClient } from 'better-auth/react'
import { anonymousClient, organizationClient } from 'better-auth/client/plugins'

const baseURL =
  import.meta.env.VITE_BETTER_AUTH_URL?.trim() ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth`
    : 'http://localhost:3000/api/auth')

export const authClient = createAuthClient({
  baseURL,
  plugins: [organizationClient(), anonymousClient()],
})

export type AppSession = typeof authClient.$Infer.Session
