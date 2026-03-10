'use client'

import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { m } from '@/paraglide/messages.js'
import { authClient } from '@/lib/auth/auth-client'
import { setPassword } from '@/lib/settings/security'
import type { SecurityPagePasswordMode } from './security-page-shared'
import { getErrorMessage, readBetterAuthResultError } from './security-page-shared'

export type SecurityPasswordLogicResult = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  passwordMessage: string | null
  canEdit: boolean
  passwordMode: SecurityPagePasswordMode
  setCurrentPasswordInput: (nextValue: string) => void
  setNewPasswordInput: (nextValue: string) => void
  setConfirmPasswordInput: (nextValue: string) => void
  submitPasswordChange: () => Promise<void>
}

/**
 * Logic for password updates and first-time password setup.
 */
export function useSecurityPasswordLogic(
  canEdit: boolean,
  passwordMode: SecurityPagePasswordMode,
  refreshConnectedLoginMethods: () => Promise<void>,
) {
  const setPasswordFn = useServerFn(setPassword)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const setCurrentPasswordInput = (nextValue: string) => {
    setPasswordMessage(null)
    setCurrentPassword(nextValue)
  }

  const setNewPasswordInput = (nextValue: string) => {
    setPasswordMessage(null)
    setNewPassword(nextValue)
  }

  const setConfirmPasswordInput = (nextValue: string) => {
    setPasswordMessage(null)
    setConfirmPassword(nextValue)
  }

  const submitPasswordChange = async () => {
    const normalizedCurrentPassword = currentPassword.trim()
    const normalizedNewPassword = newPassword.trim()
    const normalizedConfirmPassword = confirmPassword.trim()

    if (!canEdit) {
      setPasswordMessage(m.settings_security_error_sign_in_required())
      return
    }
    if (!normalizedNewPassword) {
      setPasswordMessage(m.settings_security_error_new_required())
      return
    }
    if (!normalizedConfirmPassword) {
      setPasswordMessage(m.settings_security_error_confirm_required())
      return
    }
    if (normalizedNewPassword !== normalizedConfirmPassword) {
      setPasswordMessage(m.settings_security_error_password_mismatch())
      return
    }

    try {
      if (passwordMode === 'change') {
        if (!normalizedCurrentPassword) {
          setPasswordMessage(m.settings_security_error_current_required())
          return
        }
        if (normalizedCurrentPassword === normalizedNewPassword) {
          setPasswordMessage(m.settings_security_error_password_unchanged())
          return
        }

        const result = await authClient.changePassword({
          currentPassword: normalizedCurrentPassword,
          newPassword: normalizedNewPassword,
          revokeOtherSessions: true,
        })
        const apiErrorMessage = readBetterAuthResultError(result, m.settings_security_error_default())
        if (apiErrorMessage != null) {
          setPasswordMessage(apiErrorMessage)
          return
        }
      } else {
        await setPasswordFn({
          data: {
            newPassword: normalizedNewPassword,
          },
        })
        await refreshConnectedLoginMethods()
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage(
        passwordMode === 'change'
          ? m.settings_security_success()
          : m.settings_security_set_success(),
      )
    } catch (cause) {
      setPasswordMessage(
        getErrorMessage(
          cause,
          passwordMode === 'change'
            ? m.settings_security_error_default()
            : m.settings_security_set_error_default(),
        ),
      )
    }
  }

  return {
    currentPassword,
    newPassword,
    confirmPassword,
    passwordMessage,
    canEdit,
    passwordMode,
    setCurrentPasswordInput,
    setNewPasswordInput,
    setConfirmPasswordInput,
    submitPasswordChange,
  }
}
