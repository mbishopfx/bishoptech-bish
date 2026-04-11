'use client'

import { useServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useState } from 'react'
import {
  runSelfHostedSetup,
  verifySelfHostedSetupAccess,
} from '@/lib/frontend/self-host/instance.functions'
import { AUTH_PASSWORD_MIN_LENGTH } from '@/components/auth/auth-shared'
import { m } from '@/paraglide/messages.js'

export type SetupStep = 1 | 2

export type SetupPageLogicResult = {
  step: SetupStep
  setupToken: string
  name: string
  email: string
  password: string
  confirmPassword: string
  error: string
  success: string
  isVerifyingToken: boolean
  isSubmittingAccount: boolean
  isRedirectingToChat: boolean
  setSetupToken: (value: string) => void
  setName: (value: string) => void
  setEmail: (value: string) => void
  setPassword: (value: string) => void
  setConfirmPassword: (value: string) => void
  handleVerifyToken: (
    event: React.SyntheticEvent<HTMLFormElement>,
  ) => Promise<void>
  handleSubmit: (
    event: React.SyntheticEvent<HTMLFormElement>,
  ) => Promise<void>
}

type StructuredSetupError = {
  message?: string
  code?: string
  path?: Array<string | number>
  minimum?: number
}

function readStructuredSetupError(value: unknown): StructuredSetupError | null {
  if (!value || typeof value !== 'object') return null
  return value as StructuredSetupError
}

function readPreHydrationInputValue(inputId: string): string {
  if (typeof window === 'undefined') return ''

  const input = document.getElementById(inputId)
  return input instanceof HTMLInputElement ? input.value : ''
}

const SETUP_TOKEN_SEARCH_PARAM_KEYS = ['setupToken', 'setup-token', 'token'] as const

function readSetupTokenFromURL(): string {
  if (typeof window === 'undefined') return ''

  const searchParams = new URLSearchParams(window.location.search)
  for (const key of SETUP_TOKEN_SEARCH_PARAM_KEYS) {
    const value = searchParams.get(key)?.trim()
    if (value) {
      return value
    }
  }

  return ''
}

function removeSetupTokenFromURL(): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  let changed = false

  for (const key of SETUP_TOKEN_SEARCH_PARAM_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }

  if (!changed) return

  const nextPath =
    url.pathname +
    (url.search ? url.search : '') +
    (url.hash ? url.hash : '')

  window.history.replaceState(window.history.state, '', nextPath)
}

/**
 * Server functions can bubble up Zod validation payloads as serialized JSON.
 * Extracting the first field-level message keeps setup UX aligned with the
 * auth pages, which surface concise guidance instead of raw error payloads.
 */
function normalizeSetupErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback
  }

  const trimmedMessage = error.message.trim()
  if (!trimmedMessage) return fallback

  try {
    const parsed = JSON.parse(trimmedMessage) as unknown

    if (Array.isArray(parsed)) {
      const firstError = readStructuredSetupError(parsed[0])
      if (firstError?.code === 'too_small' && firstError.path?.[0] === 'password') {
        return m.setup_error_password_min_length({
          count: String(AUTH_PASSWORD_MIN_LENGTH),
        })
      }

      if (typeof firstError?.message === 'string' && firstError.message.trim()) {
        return firstError.message
      }
    }

    const structuredError = readStructuredSetupError(parsed)
    if (typeof structuredError?.message === 'string' && structuredError.message.trim()) {
      return structuredError.message
    }
  } catch {
    return trimmedMessage
  }

  return trimmedMessage
}

export function useSetupPageLogic(): SetupPageLogicResult {
  const verifySetupAccess = useServerFn(verifySelfHostedSetupAccess)
  const runSetup = useServerFn(runSelfHostedSetup)
  const [step, setStep] = useState<SetupStep>(1)
  const [setupToken, setSetupTokenState] = useState(() => {
    const tokenFromURL = readSetupTokenFromURL()
    if (tokenFromURL) {
      return tokenFromURL
    }

    return readPreHydrationInputValue('setup-token')
  })
  const [name, setNameState] = useState('')
  const [email, setEmailState] = useState('')
  const [password, setPasswordState] = useState('')
  const [confirmPassword, setConfirmPasswordState] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isVerifyingToken, setIsVerifyingToken] = useState(false)
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false)
  const [isRedirectingToChat, setIsRedirectingToChat] = useState(false)

  useEffect(() => {
    removeSetupTokenFromURL()
  }, [])

  const setSetupToken = useCallback((value: string) => {
    setSetupTokenState(value)
    setError('')
  }, [])

  const setName = useCallback((value: string) => {
    setNameState(value)
    setError('')
  }, [])

  const setEmail = useCallback((value: string) => {
    setEmailState(value)
    setError('')
  }, [])

  const setPassword = useCallback((value: string) => {
    setPasswordState(value)
    setError('')
  }, [])

  const setConfirmPassword = useCallback((value: string) => {
    setConfirmPasswordState(value)
    setError('')
  }, [])

  const handleVerifyToken = useCallback(
    async (event: React.SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError('')
      setSuccess('')
      setIsVerifyingToken(true)

      try {
        await verifySetupAccess({
          data: {
            setupToken,
          },
        })

        setStep(2)
      } catch (setupError) {
        setError(
          normalizeSetupErrorMessage(setupError, m.setup_error_verify_token()),
        )
      } finally {
        setIsVerifyingToken(false)
      }
    },
    [setupToken, verifySetupAccess],
  )

  const handleSubmit = useCallback(
    async (event: React.SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError('')
      setSuccess('')

      if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
        setError(
          m.setup_error_password_min_length({
            count: String(AUTH_PASSWORD_MIN_LENGTH),
          }),
        )
        return
      }

      if (password !== confirmPassword) {
        setError(m.common_password_mismatch())
        return
      }

      setIsSubmittingAccount(true)

      try {
        await runSetup({
          data: {
            name,
            email,
            password,
            setupToken,
          },
        })

        setIsRedirectingToChat(true)
        window.location.replace('/chat')
      } catch (setupError) {
        setIsRedirectingToChat(false)
        setError(
          normalizeSetupErrorMessage(setupError, m.setup_error_finish()),
        )
      } finally {
        setIsSubmittingAccount(false)
      }
    },
    [confirmPassword, email, name, password, runSetup, setupToken],
  )

  return {
    step,
    setupToken,
    name,
    email,
    password,
    confirmPassword,
    error,
    success,
    isVerifyingToken,
    isSubmittingAccount,
    isRedirectingToChat,
    setSetupToken,
    setName,
    setEmail,
    setPassword,
    setConfirmPassword,
    handleVerifyToken,
    handleSubmit,
  }
}
