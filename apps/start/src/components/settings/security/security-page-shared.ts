import { m } from '@/paraglide/messages.js'

export type SecurityPagePasswordMode = 'change' | 'set'

export type SecurityPageLogicResult = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  passwordMessage: string | null
  sessionsMessage: string | null
  loginMethodsMessage: string | null
  primaryEmail: string | null
  sessionsLoaded: boolean
  loginMethodsLoaded: boolean
  canEdit: boolean
  passwordMode: SecurityPagePasswordMode
  activeSessions: Array<ActiveSessionViewModel>
  connectedLoginMethods: Array<ConnectedLoginMethodViewModel>
  sessionsLoading: boolean
  loginMethodsLoading: boolean
  sessionsRefreshing: boolean
  mfaEnabled: boolean
  mfaPendingVerification: boolean
  mfaBusy: boolean
  mfaMessage: string | null
  mfaSetupTotpURI: string | null
  mfaSetupStep: 'verify' | 'backup-codes' | null
  mfaBackupCodes: Array<string>
  mfaSetupPassword: string
  mfaSetupCode: string
  mfaDisablePassword: string
  revokingSessionToken: string | null
  linkingProviderId: string | null
  unlinkingLoginMethodId: string | null
  revokingAllOtherSessions: boolean
  setCurrentPasswordInput: (nextValue: string) => void
  setNewPasswordInput: (nextValue: string) => void
  setConfirmPasswordInput: (nextValue: string) => void
  setMfaSetupPasswordInput: (nextValue: string) => void
  setMfaSetupCodeInput: (nextValue: string) => void
  setMfaDisablePasswordInput: (nextValue: string) => void
  submitPasswordChange: () => Promise<void>
  enableMfa: () => Promise<void>
  verifyMfaTotp: () => Promise<void>
  cancelMfaSetup: () => void
  finishMfaSetup: () => Promise<void>
  disableMfa: () => Promise<void>
  refreshActiveSessions: () => Promise<void>
  refreshConnectedLoginMethods: () => Promise<void>
  revokeSessionByToken: (sessionToken: string) => Promise<void>
  connectLoginProvider: (providerId: string) => Promise<void>
  unlinkConnectedLoginMethod: (method: ConnectedLoginMethodViewModel) => Promise<void>
  revokeAllOtherSessions: () => Promise<void>
}

export type ActiveSessionViewModel = {
  sessionId: string | null
  sessionToken: string
  label: string
  ipAddress: string | null
  createdAt: Date | null
  expiresAt: Date | null
  isCurrent: boolean
}

export type ConnectedLoginMethodViewModel = {
  methodId: string
  providerId: string
  providerLabel: string
  accountId: string | null
  createdAt: Date | null
}

export function getErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim().length > 0) {
    return normalizeSecurityErrorMessage(cause.message, fallback)
  }
  return fallback
}

/**
 * Maps provider-specific auth errors to user-facing copy that explains what action to take.
 */
export function normalizeSecurityErrorMessage(message: string, fallback: string): string {
  const normalizedMessage = message.trim()
  const lowerCaseMessage = normalizedMessage.toLowerCase()

  if (
    lowerCaseMessage === 'invalid password' ||
    lowerCaseMessage.includes('invalid password')
  ) {
    return m.settings_security_error_current_invalid()
  }
  if (lowerCaseMessage === 'invalid code' || lowerCaseMessage.includes('invalid code')) {
    return m.settings_security_mfa_error_invalid_code()
  }

  return normalizedMessage.length > 0 ? normalizedMessage : fallback
}

export function readBetterAuthResultError(result: unknown, fallback: string): string | null {
  if (result == null || typeof result !== 'object') {
    return null
  }

  const error = (result as { error?: unknown }).error
  if (error == null) {
    return null
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return normalizeSecurityErrorMessage(error, fallback)
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return normalizeSecurityErrorMessage(error.message, fallback)
  }

  const message = (error as { message?: unknown }).message
  if (typeof message === 'string' && message.trim().length > 0) {
    return normalizeSecurityErrorMessage(message, fallback)
  }

  return fallback
}

export function readRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

export function readStringField(
  source: Record<string, unknown> | null,
  keys: Array<string>,
): string | null {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return null
}

export function readBooleanField(
  source: Record<string, unknown> | null,
  keys: Array<string>,
): boolean | null {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
  }
  return null
}

export function readDateField(source: Record<string, unknown> | null, keys: Array<string>): Date | null {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
  }
  return null
}

export function readStringArrayField(
  source: Record<string, unknown> | null,
  keys: Array<string>,
): Array<string> | null {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (!Array.isArray(value)) continue
    const parsed = value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
    if (parsed.length > 0) return parsed
  }
  return null
}

export function readAccountsArray(result: unknown): Array<unknown> {
  if (Array.isArray(result)) return result
  const resultRecord = readRecord(result)
  if (!resultRecord) return []
  if (Array.isArray(resultRecord.accounts)) return resultRecord.accounts
  const data = resultRecord.data
  if (Array.isArray(data)) return data
  const dataRecord = readRecord(data)
  if (!dataRecord) return []
  const accounts = dataRecord.accounts
  return Array.isArray(accounts) ? accounts : []
}
