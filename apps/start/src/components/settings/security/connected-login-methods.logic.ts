'use client'

import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/auth-client'
import { m } from '@/paraglide/messages.js'
import {
  getErrorMessage,
  readAccountsArray,
  readBetterAuthResultError,
  readRecord,
  readDateField,
  readStringField,
} from './security-page-shared'
import type {
  ConnectedLoginMethodViewModel,
} from './security-page-shared'

export type ConnectedLoginMethodsLogicResult = {
  connectedLoginMethods: Array<ConnectedLoginMethodViewModel>
  loginMethodsLoaded: boolean
  loginMethodsLoading: boolean
  loginMethodsMessage: string | null
  linkingProviderId: string | null
  unlinkingLoginMethodId: string | null
  hasCredentialPassword: boolean
  refreshConnectedLoginMethods: () => Promise<void>
  connectLoginProvider: (providerId: string) => Promise<void>
  unlinkConnectedLoginMethod: (method: ConnectedLoginMethodViewModel) => Promise<void>
}

function normalizeProviderLabel(providerId: string): string {
  const normalizedProvider = providerId.trim().toLowerCase()
  if (
    normalizedProvider === 'credential' ||
    normalizedProvider === 'credentials' ||
    normalizedProvider === 'email-password'
  ) {
    return m.settings_security_login_methods_provider_email_password()
  }
  if (normalizedProvider === 'anonymous') {
    return m.settings_security_login_methods_provider_guest()
  }
  if (normalizedProvider.length === 0) {
    return m.settings_security_login_methods_provider_unknown()
  }
  return normalizedProvider
    .split(/[-_]/g)
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

function mapConnectedLoginMethod(entry: unknown): ConnectedLoginMethodViewModel | null {
  const root = readRecord(entry)
  if (!root) return null
  const nestedAccount = readRecord(root.account)

  const providerId =
    readStringField(root, ['providerId', 'provider', 'providerName']) ??
    readStringField(nestedAccount, ['providerId', 'provider', 'providerName']) ??
    ''

  const accountId =
    readStringField(root, ['accountId', 'id']) ?? readStringField(nestedAccount, ['accountId', 'id'])

  const createdAt =
    readDateField(root, ['createdAt', 'created_at']) ??
    readDateField(nestedAccount, ['createdAt', 'created_at'])

  const methodId = accountId ?? `${providerId || 'unknown'}:${createdAt?.getTime() ?? 0}`

  return {
    methodId,
    providerId,
    providerLabel: normalizeProviderLabel(providerId),
    accountId: accountId ?? null,
    createdAt,
  }
}

function hasCredentialLoginMethod(methods: Array<ConnectedLoginMethodViewModel>): boolean {
  return methods.some((method) => {
    const normalizedProvider = method.providerId.trim().toLowerCase()
    return (
      normalizedProvider === 'credential' ||
      normalizedProvider === 'credentials' ||
      normalizedProvider === 'email-password'
    )
  })
}

function resolveSettingsCallbackURLClient(): string {
  const raw = import.meta.env.VITE_BETTER_AUTH_URL?.trim()
  if (!raw) return '/settings'
  return `${raw.replace(/\/+$/, '')}/settings`
}

export function useConnectedLoginMethodsLogic(canEdit: boolean) {
  const [connectedLoginMethods, setConnectedLoginMethods] = useState<
    Array<ConnectedLoginMethodViewModel>
  >([])
  const [loginMethodsLoaded, setLoginMethodsLoaded] = useState(false)
  const [loginMethodsLoading, setLoginMethodsLoading] = useState(false)
  const [linkingProviderId, setLinkingProviderId] = useState<string | null>(null)
  const [unlinkingLoginMethodId, setUnlinkingLoginMethodId] = useState<string | null>(null)
  const [loginMethodsMessage, setLoginMethodsMessage] = useState<string | null>(null)

  const refreshConnectedLoginMethods = useCallback(async () => {
    if (!canEdit) {
      setConnectedLoginMethods([])
      setLoginMethodsLoaded(false)
      setLoginMethodsMessage(null)
      return
    }

    setLoginMethodsMessage(null)
    setLoginMethodsLoading(true)

    try {
      const authClientWithAccountsApi = authClient as unknown as {
        listAccounts?: () => Promise<unknown>
        user?: {
          listAccounts?: () => Promise<unknown>
          unlinkAccount?: (payload: Record<string, string>) => Promise<unknown>
        }
      }
      const result =
        typeof authClientWithAccountsApi.listAccounts === 'function'
          ? await authClientWithAccountsApi.listAccounts()
          : await authClientWithAccountsApi.user?.listAccounts?.()
      const apiErrorMessage = readBetterAuthResultError(
        result,
        m.settings_security_login_methods_error_load_default(),
      )
      if (apiErrorMessage != null) {
        setLoginMethodsMessage(apiErrorMessage)
        return
      }

      const normalizedMethods = readAccountsArray(result)
        .map((entry) => mapConnectedLoginMethod(entry))
        .filter((item): item is ConnectedLoginMethodViewModel => item != null)
      setConnectedLoginMethods(normalizedMethods)
    } catch (cause) {
      setLoginMethodsMessage(
        getErrorMessage(cause, m.settings_security_login_methods_error_load_default()),
      )
    } finally {
      setLoginMethodsLoaded(true)
      setLoginMethodsLoading(false)
    }
  }, [canEdit])

  useEffect(() => {
    if (!canEdit) {
      setConnectedLoginMethods([])
      setLoginMethodsLoaded(false)
      setLoginMethodsMessage(null)
      return
    }
    void refreshConnectedLoginMethods()
  }, [canEdit, refreshConnectedLoginMethods])

  const unlinkConnectedLoginMethod = async (method: ConnectedLoginMethodViewModel) => {
    if (!canEdit) {
      setLoginMethodsMessage(null)
      return
    }

    if (connectedLoginMethods.length <= 1) {
      setLoginMethodsMessage(m.settings_security_login_methods_error_last_method())
      return
    }

    const providerId = method.providerId.trim()
    if (providerId.length === 0) {
      setLoginMethodsMessage(m.settings_security_login_methods_error_unlink_default())
      return
    }

    setUnlinkingLoginMethodId(method.methodId)
    setLoginMethodsMessage(null)

    try {
      const authClientWithAccountsApi = authClient as unknown as {
        unlinkAccount?: (payload: Record<string, string>) => Promise<unknown>
        user?: {
          unlinkAccount?: (payload: Record<string, string>) => Promise<unknown>
        }
      }

      const unlinkAccount =
        authClientWithAccountsApi.unlinkAccount ?? authClientWithAccountsApi.user?.unlinkAccount
      if (typeof unlinkAccount !== 'function') {
        throw new Error(m.settings_security_login_methods_error_unlink_default())
      }

      const payload: Record<string, string> = { providerId }
      if (method.accountId) {
        payload.accountId = method.accountId
      }
      const result = await unlinkAccount(payload)
      const apiErrorMessage = readBetterAuthResultError(
        result,
        m.settings_security_login_methods_error_unlink_default(),
      )
      if (apiErrorMessage != null) {
        setLoginMethodsMessage(apiErrorMessage)
        return
      }

      setLoginMethodsMessage(m.settings_security_login_methods_success_unlink())
      await refreshConnectedLoginMethods()
    } catch (cause) {
      setLoginMethodsMessage(
        getErrorMessage(cause, m.settings_security_login_methods_error_unlink_default()),
      )
    } finally {
      setUnlinkingLoginMethodId(null)
    }
  }

  const connectLoginProvider = async (providerId: string) => {
    if (!canEdit) {
      setLoginMethodsMessage(null)
      return
    }

    const normalizedProviderId = providerId.trim()
    if (normalizedProviderId.length === 0) {
      setLoginMethodsMessage(m.settings_security_login_methods_error_connect_default())
      return
    }

    setLinkingProviderId(normalizedProviderId)
    setLoginMethodsMessage(null)

    try {
      const authClientWithAccountsApi = authClient as unknown as {
        linkSocial?: (payload: Record<string, string>) => Promise<unknown>
        user?: {
          linkSocial?: (payload: Record<string, string>) => Promise<unknown>
        }
      }
      const linkSocial = authClientWithAccountsApi.linkSocial ?? authClientWithAccountsApi.user?.linkSocial
      if (typeof linkSocial !== 'function') {
        throw new Error(m.settings_security_login_methods_error_connect_default())
      }

      const result = await linkSocial({
        provider: normalizedProviderId,
        callbackURL: resolveSettingsCallbackURLClient(),
      })
      const apiErrorMessage = readBetterAuthResultError(
        result,
        m.settings_security_login_methods_error_connect_default(),
      )
      if (apiErrorMessage != null) {
        setLoginMethodsMessage(apiErrorMessage)
        return
      }

      setLoginMethodsMessage(m.settings_security_login_methods_success_connect())
      await refreshConnectedLoginMethods()
    } catch (cause) {
      setLoginMethodsMessage(
        getErrorMessage(cause, m.settings_security_login_methods_error_connect_default()),
      )
    } finally {
      setLinkingProviderId(null)
    }
  }

  return {
    connectedLoginMethods,
    loginMethodsLoaded,
    loginMethodsLoading,
    loginMethodsMessage,
    linkingProviderId,
    unlinkingLoginMethodId,
    hasCredentialPassword: hasCredentialLoginMethod(connectedLoginMethods),
    refreshConnectedLoginMethods,
    connectLoginProvider,
    unlinkConnectedLoginMethod,
  }
}
