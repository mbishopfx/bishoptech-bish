import { readPublicRuntimeEnv } from '@/utils/public-runtime-env'

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const AUTH_PASSWORD_MIN_LENGTH = 8

/** OTP expiry in seconds. */
export const OTP_EXPIRES_IN_SECONDS = 5 * 60

/**
 * Normalizes user-entered email addresses before sending them.
 */
export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Lightweight client-side validation for common email typos before network requests.
 */
export function isValidEmailAddress(value: string): boolean {
  return EMAIL_ADDRESS_PATTERN.test(normalizeEmailAddress(value))
}

/**
 * Builds an absolute URL for callback and redirect parameters.
 */
export function getAbsoluteAppURL(path: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : readPublicRuntimeEnv('VITE_BETTER_AUTH_URL')?.replace(/\/+$/, '')

  if (!origin) {
    throw new Error('Missing app origin for auth callback URLs.')
  }

  return new URL(path, `${origin}/`).toString()
}

/**
 * Derives a stable, human-readable fallback from the email local-part.
 */
export function getDefaultAuthDisplayName(email: string): string {
  const normalizedEmail = normalizeEmailAddress(email)
  const [localPart] = normalizedEmail.split('@')
  const candidate = localPart?.replace(/[._-]+/g, ' ').trim()

  if (!candidate) {
    return normalizedEmail
  }

  return candidate.charAt(0).toUpperCase() + candidate.slice(1)
}
