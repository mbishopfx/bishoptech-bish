import type { GooglePickerConnectionSummary } from '@/lib/shared/google-picker'

export const GOOGLE_PICKER_REQUIRED_ENV = [
  'BISH_ENCRYPTION_KEY',
  'GOOGLE_PICKER_CLIENT_ID',
  'GOOGLE_PICKER_CLIENT_SECRET',
  'GOOGLE_PICKER_REDIRECT_URI',
] as const

type GooglePickerConnectionAccount = {
  readonly email: string | null
  readonly display_name: string | null
  readonly status: 'connected' | 'needs_auth' | 'config_required'
  readonly last_used_at: number | null
}

export function getMissingGooglePickerEnv(
  env: NodeJS.ProcessEnv,
): readonly string[] {
  return GOOGLE_PICKER_REQUIRED_ENV.filter((name) => !env[name]?.trim())
}

export function getGooglePickerConnectionSummary(
  account: GooglePickerConnectionAccount | null,
  env: NodeJS.ProcessEnv = process.env,
): GooglePickerConnectionSummary {
  const missingEnv = getMissingGooglePickerEnv(env)
  if (missingEnv.length > 0) {
    return {
      connected: false,
      status: 'config_required',
      email: account?.email ?? null,
      displayName: account?.display_name ?? null,
      lastUsedAt: account?.last_used_at ?? null,
      missingEnv,
    }
  }

  if (!account) {
    return {
      connected: false,
      status: 'needs_auth',
      email: null,
      displayName: null,
      lastUsedAt: null,
      missingEnv: [],
    }
  }

  return {
    connected: account.status === 'connected',
    status: account.status,
    email: account.email,
    displayName: account.display_name,
    lastUsedAt: account.last_used_at,
    missingEnv: [],
  }
}
