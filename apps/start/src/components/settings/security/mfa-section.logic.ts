'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth/auth-client'
import { m } from '@/paraglide/messages.js'
import {
  getErrorMessage,
  readBetterAuthResultError,
  readBooleanField,
  readRecord,
  readStringArrayField,
  readStringField,
} from './security-page-shared'

export type MfaSectionLogicResult = {
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
  setMfaSetupPasswordInput: (nextValue: string) => void
  setMfaSetupCodeInput: (nextValue: string) => void
  setMfaDisablePasswordInput: (nextValue: string) => void
  enableMfa: () => Promise<void>
  verifyMfaTotp: () => Promise<void>
  cancelMfaSetup: () => void
  finishMfaSetup: () => Promise<void>
  disableMfa: () => Promise<void>
}

export function useMfaSectionLogic(canEdit: boolean, user: unknown, refetchSession: () => Promise<void>) {
  const [mfaMessage, setMfaMessage] = useState<string | null>(null)
  const [mfaBusy, setMfaBusy] = useState(false)
  const [mfaSetupTotpURI, setMfaSetupTotpURI] = useState<string | null>(null)
  const [mfaSetupStep, setMfaSetupStep] = useState<'verify' | 'backup-codes' | null>(null)
  const [mfaBackupCodes, setMfaBackupCodes] = useState<Array<string>>([])
  const [mfaSetupPassword, setMfaSetupPassword] = useState('')
  const [mfaSetupCode, setMfaSetupCode] = useState('')
  const [mfaDisablePassword, setMfaDisablePassword] = useState('')

  const mfaEnabled = readTwoFactorEnabled(user)
  const mfaPendingVerification = mfaSetupTotpURI != null || mfaSetupStep === 'backup-codes'

  const setMfaSetupPasswordInput = (nextValue: string) => {
    setMfaMessage(null)
    setMfaSetupPassword(nextValue)
  }

  const setMfaSetupCodeInput = (nextValue: string) => {
    setMfaSetupCode((currentValue) => {
      if (currentValue !== nextValue) {
        setMfaMessage(null)
      }
      return nextValue
    })
  }

  const setMfaDisablePasswordInput = (nextValue: string) => {
    setMfaMessage(null)
    setMfaDisablePassword(nextValue)
  }

  const enableMfa = async () => {
    if (!canEdit) {
      setMfaMessage(m.settings_security_error_sign_in_required())
      return
    }

    const normalizedPassword = mfaSetupPassword.trim()
    if (!normalizedPassword) {
      setMfaMessage(m.settings_security_error_current_required())
      return
    }

    setMfaBusy(true)
    setMfaMessage(null)

    try {
      const result = await authClient.twoFactor.enable({
        password: normalizedPassword,
      })
      const apiErrorMessage = readBetterAuthResultError(result, m.settings_security_mfa_error_enable())
      if (apiErrorMessage != null) {
        setMfaMessage(apiErrorMessage)
        return
      }

      const data = readTwoFactorEnableData(result)
      if (!data.totpURI) {
        setMfaMessage(m.settings_security_mfa_error_enable())
        return
      }

      setMfaSetupTotpURI(data.totpURI)
      setMfaSetupStep('verify')
      setMfaBackupCodes(data.backupCodes)
      setMfaSetupCode('')
      setMfaMessage(null)
    } catch (cause) {
      setMfaMessage(getErrorMessage(cause, m.settings_security_mfa_error_enable()))
    } finally {
      setMfaBusy(false)
    }
  }

  const verifyMfaTotp = async () => {
    if (!canEdit) {
      setMfaMessage(m.settings_security_error_sign_in_required())
      return
    }

    const normalizedCode = mfaSetupCode.replace(/\s+/g, '')
    if (normalizedCode.length === 0) {
      setMfaMessage(m.settings_security_mfa_error_code_required())
      return
    }

    setMfaBusy(true)
    setMfaMessage(null)

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: normalizedCode,
        trustDevice: true,
      })
      const apiErrorMessage = readBetterAuthResultError(result, m.settings_security_mfa_error_verify())
      if (apiErrorMessage != null) {
        setMfaMessage(apiErrorMessage)
        return
      }

      setMfaSetupStep('backup-codes')
      setMfaSetupPassword('')
      setMfaSetupCode('')
      setMfaMessage(null)
    } catch (cause) {
      setMfaMessage(getErrorMessage(cause, m.settings_security_mfa_error_verify()))
    } finally {
      setMfaBusy(false)
    }
  }

  const cancelMfaSetup = () => {
    setMfaSetupTotpURI(null)
    setMfaSetupStep(null)
    setMfaSetupCode('')
    setMfaBackupCodes([])
    setMfaMessage(null)
  }

  const finishMfaSetup = async () => {
    setMfaSetupTotpURI(null)
    setMfaSetupStep(null)
    setMfaSetupPassword('')
    setMfaSetupCode('')
    setMfaBackupCodes([])
    try {
      await refetchSession()
    } finally {
      setMfaMessage(m.settings_security_mfa_success_enabled())
    }
  }

  const disableMfa = async () => {
    if (!canEdit) {
      setMfaMessage(m.settings_security_error_sign_in_required())
      return
    }

    const normalizedPassword = mfaDisablePassword.trim()
    if (!normalizedPassword) {
      setMfaMessage(m.settings_security_error_current_required())
      return
    }

    setMfaBusy(true)
    setMfaMessage(null)

    try {
      const result = await authClient.twoFactor.disable({
        password: normalizedPassword,
      })
      const apiErrorMessage = readBetterAuthResultError(result, m.settings_security_mfa_error_disable())
      if (apiErrorMessage != null) {
        setMfaMessage(apiErrorMessage)
        return
      }

      setMfaDisablePassword('')
      setMfaSetupPassword('')
      setMfaSetupCode('')
      setMfaSetupTotpURI(null)
      setMfaBackupCodes([])
      setMfaMessage(m.settings_security_mfa_success_disabled())
      await refetchSession()
    } catch (cause) {
      setMfaMessage(getErrorMessage(cause, m.settings_security_mfa_error_disable()))
    } finally {
      setMfaBusy(false)
    }
  }

  return {
    mfaEnabled,
    mfaPendingVerification,
    mfaBusy,
    mfaMessage,
    mfaSetupTotpURI,
    mfaSetupStep,
    mfaBackupCodes,
    mfaSetupPassword,
    mfaSetupCode,
    mfaDisablePassword,
    setMfaSetupPasswordInput,
    setMfaSetupCodeInput,
    setMfaDisablePasswordInput,
    enableMfa,
    verifyMfaTotp,
    cancelMfaSetup,
    finishMfaSetup,
    disableMfa,
  }
}

function readTwoFactorEnableData(result: unknown): {
  totpURI: string | null
  backupCodes: Array<string>
} {
  const root = readRecord(result)
  const data = readRecord(root?.data)
  const source = data ?? root
  return {
    totpURI:
      readStringField(source, ['totpURI', 'totpUri', 'totp_uri']) ??
      readStringField(data, ['totpURI', 'totpUri', 'totp_uri']) ??
      null,
    backupCodes:
      readStringArrayField(source, ['backupCodes', 'backup_codes']) ??
      readStringArrayField(data, ['backupCodes', 'backup_codes']) ??
      [],
  }
}

function readTwoFactorEnabled(user: unknown): boolean {
  const userRecord = readRecord(user)
  const value = readBooleanField(userRecord, ['twoFactorEnabled', 'isTwoFactorEnabled'])
  return value === true
}

