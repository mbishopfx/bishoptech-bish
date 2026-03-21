'use client'

import { useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { m } from '@/paraglide/messages.js'
import { authClient } from '@/lib/frontend/auth/auth-client'
import {
  AUTH_PASSWORD_MIN_LENGTH,
  OTP_EXPIRES_IN_SECONDS,
  getAbsoluteAppURL,
  isValidEmailAddress,
  normalizeEmailAddress,
} from '@/components/auth/auth-shared'

export type ForgotPasswordStep =
  | 'request-email'
  | 'enter-otp'
  | 'set-new-password'

function readForgotPasswordErrorMessage(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
) {
  if (!error) return fallback

  if (error.code === 'TOO_MANY_ATTEMPTS') {
    return m.auth_error_too_many_attempts()
  }

  return error.message ?? fallback
}

export type ForgotPasswordLogicResult = {
  email: string
  setEmail: (value: string) => void
  otp: string
  newPassword: string
  setNewPassword: (value: string) => void
  confirmPassword: string
  setConfirmPassword: (value: string) => void
  otpSentAt: number | null
  step: ForgotPasswordStep
  setStep: (step: ForgotPasswordStep) => void
  error: string
  setError: (value: string) => void
  successMessage: string
  setSuccessMessage: (value: string) => void
  isLoading: boolean
  otpExpiresInSeconds: number
  handleEmailSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
  handleOtpSubmit: (value: string) => Promise<void>
  handleResendOtp: () => Promise<void>
  handlePasswordReset: (
    event: React.FormEvent<HTMLFormElement>,
  ) => Promise<void>
}

export function useForgotPasswordLogic(
  redirectTarget: string,
): ForgotPasswordLogicResult {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null)
  const [step, setStep] = useState<ForgotPasswordStep>('request-email')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleEmailSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const normalizedEmail = normalizeEmailAddress(email)

      if (!isValidEmailAddress(normalizedEmail)) {
        setError(m.common_invalid_email())
        return
      }

      setIsLoading(true)
      setError('')
      setSuccessMessage('')

      try {
        const result = await authClient.emailOtp.requestPasswordReset({
          email: normalizedEmail,
        })

        if (result.error) {
          setError(
            readForgotPasswordErrorMessage(
              result.error,
              m.auth_forgot_error_send_failed(),
            ),
          )
          return
        }

        setOtp('')
        setOtpSentAt(Date.now())
        setStep('enter-otp')
      } catch {
        setError(m.auth_forgot_error_send_failed())
      } finally {
        setIsLoading(false)
      }
    },
    [email],
  )

  const handleOtpSubmit = useCallback(async (value: string) => {
    setError('')
    setOtp(value.trim())
    setStep('set-new-password')
  }, [])

  const handleResendOtp = useCallback(async () => {
    const normalizedEmail = normalizeEmailAddress(email)

    if (!normalizedEmail) {
      setError(m.auth_forgot_error_no_email_resend())
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await authClient.emailOtp.requestPasswordReset({
        email: normalizedEmail,
      })

      if (result.error) {
        setError(
          readForgotPasswordErrorMessage(
            result.error,
            m.auth_forgot_error_resend_failed(),
          ),
        )
        return
      }

      setOtp('')
      setOtpSentAt(Date.now())
    } catch {
      setError(m.auth_forgot_error_resend_failed())
    } finally {
      setIsLoading(false)
    }
  }, [email])

  const handlePasswordReset = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const normalizedEmail = normalizeEmailAddress(email)

      if (otp.trim().length !== 6) {
        setError(m.common_enter_6_digits())
        setStep('enter-otp')
        return
      }

      if (newPassword.length < AUTH_PASSWORD_MIN_LENGTH) {
        setError(
          m.common_password_min_length({
            count: String(AUTH_PASSWORD_MIN_LENGTH),
          }),
        )
        return
      }

      if (newPassword !== confirmPassword) {
        setError(m.common_password_mismatch())
        return
      }

      setIsLoading(true)
      setError('')
      setSuccessMessage('')

      try {
        const result = await authClient.emailOtp.resetPassword({
          email: normalizedEmail,
          otp: otp.trim(),
          password: newPassword,
        })

        if (result.error) {
          setStep('enter-otp')
          setError(
            readForgotPasswordErrorMessage(
              result.error,
              m.common_reset_failed(),
            ),
          )
          return
        }

        setOtp('')
        setNewPassword('')
        setConfirmPassword('')

        const signInResult = await authClient.signIn.email({
          email: normalizedEmail,
          password: newPassword,
          callbackURL: getAbsoluteAppURL(redirectTarget),
        })

        if (signInResult.error) {
          setOtpSentAt(null)
          setStep('request-email')
          setSuccessMessage(m.common_password_updated())
          return
        }

        toast.success(m.common_password_updated())
        void navigate({ to: redirectTarget })
      } catch {
        setStep('enter-otp')
        setError(m.common_reset_failed())
      } finally {
        setIsLoading(false)
      }
    },
    [email, otp, newPassword, confirmPassword, redirectTarget, navigate],
  )

  return {
    email,
    setEmail,
    otp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    otpSentAt,
    step,
    setStep,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    isLoading,
    otpExpiresInSeconds: OTP_EXPIRES_IN_SECONDS,
    handleEmailSubmit,
    handleOtpSubmit,
    handleResendOtp,
    handlePasswordReset,
  }
}
