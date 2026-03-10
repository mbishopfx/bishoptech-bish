'use client'

import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/auth-client'
import { m } from '@/paraglide/messages.js'
import {
  getErrorMessage,
  readBetterAuthResultError,
  readBooleanField,
  readDateField,
  readRecord,
  readStringField,
} from './security-page-shared'
import type { ActiveSessionViewModel } from './security-page-shared'

export type SessionListLogicResult = {
  activeSessions: Array<ActiveSessionViewModel>
  sessionsLoaded: boolean
  sessionsLoading: boolean
  sessionsRefreshing: boolean
  sessionsMessage: string | null
  revokingSessionToken: string | null
  revokingAllOtherSessions: boolean
  refreshActiveSessions: () => Promise<void>
  revokeSessionByToken: (sessionToken: string) => Promise<void>
  revokeAllOtherSessions: () => Promise<void>
}

function readSessionsArray(result: unknown): Array<unknown> {
  if (Array.isArray(result)) return result
  const resultRecord = readRecord(result)
  if (!resultRecord) return []
  if (Array.isArray(resultRecord.sessions)) return resultRecord.sessions
  const data = resultRecord.data
  if (Array.isArray(data)) return data
  const dataRecord = readRecord(data)
  if (!dataRecord) return []
  const sessions = dataRecord.sessions
  return Array.isArray(sessions) ? sessions : []
}

function mapActiveSession(
  entry: unknown,
  currentSessionId: string | null,
  currentSessionToken: string | null,
): ActiveSessionViewModel | null {
  const root = readRecord(entry)
  if (!root) return null
  const nestedSession = readRecord(root.session)

  const sessionId =
    readStringField(root, ['id', 'sessionId']) ?? readStringField(nestedSession, ['id', 'sessionId'])

  const sessionToken =
    readStringField(root, ['sessionToken', 'token']) ??
    readStringField(nestedSession, ['sessionToken', 'token']) ??
    sessionId

  if (!sessionToken) return null

  const label =
    readStringField(root, ['userAgent', 'device', 'deviceName']) ??
    readStringField(nestedSession, ['userAgent', 'device', 'deviceName']) ??
    m.settings_security_sessions_device_unknown()

  const ipAddress =
    readStringField(root, ['ipAddress', 'ip']) ?? readStringField(nestedSession, ['ipAddress', 'ip'])

  const isCurrent =
    readBooleanField(root, ['isCurrent', 'current', 'active']) ??
    readBooleanField(nestedSession, ['isCurrent', 'current', 'active']) ??
    ((sessionId != null && currentSessionId != null && sessionId === currentSessionId) ||
      (currentSessionToken != null && sessionToken === currentSessionToken))

  const createdAt =
    readDateField(root, ['createdAt', 'created_at']) ??
    readDateField(nestedSession, ['createdAt', 'created_at'])

  const expiresAt =
    readDateField(root, ['expiresAt', 'expires_at']) ??
    readDateField(nestedSession, ['expiresAt', 'expires_at'])

  return {
    sessionId,
    sessionToken,
    label,
    ipAddress,
    createdAt,
    expiresAt,
    isCurrent,
  }
}

export function useSessionListLogic(
  canEdit: boolean,
  currentSessionId: string | null,
  currentSessionToken: string | null,
) {
  const [activeSessions, setActiveSessions] = useState<Array<ActiveSessionViewModel>>([])
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null)
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false)
  const [revokingSessionToken, setRevokingSessionToken] = useState<string | null>(null)
  const [revokingAllOtherSessions, setRevokingAllOtherSessions] = useState(false)

  const refreshActiveSessions = useCallback(async () => {
    if (!canEdit) {
      setActiveSessions([])
      setSessionsLoaded(false)
      setSessionsMessage(null)
      return
    }

    setSessionsMessage(null)
    setSessionsRefreshing(true)
    setSessionsLoading(true)

    try {
      const authClientWithSessionApi = authClient as unknown as {
        listSessions?: () => Promise<unknown>
      }
      const result =
        typeof authClientWithSessionApi.listSessions === 'function'
          ? await authClientWithSessionApi.listSessions()
          : await authClient.multiSession.listDeviceSessions()
      const apiErrorMessage = readBetterAuthResultError(
        result,
        m.settings_security_sessions_error_load_default(),
      )
      if (apiErrorMessage != null) {
        setSessionsMessage(apiErrorMessage)
        return
      }

      const normalizedSessions = readSessionsArray(result)
        .map((entry) => mapActiveSession(entry, currentSessionId, currentSessionToken))
        .filter((item): item is ActiveSessionViewModel => item != null)
      setActiveSessions(normalizedSessions)
    } catch (cause) {
      setSessionsMessage(getErrorMessage(cause, m.settings_security_sessions_error_load_default()))
    } finally {
      setSessionsLoaded(true)
      setSessionsLoading(false)
      setSessionsRefreshing(false)
    }
  }, [canEdit, currentSessionId, currentSessionToken])

  useEffect(() => {
    if (!canEdit) {
      setActiveSessions([])
      setSessionsLoaded(false)
      setSessionsMessage(null)
      return
    }
    void refreshActiveSessions()
  }, [canEdit, refreshActiveSessions])

  const revokeSessionWithFallbackKeys = useCallback(
    async (sessionRef: string): Promise<unknown> => {
      const authClientWithSessionApi = authClient as unknown as {
        revokeSession?: (payload: Record<string, string>) => Promise<unknown>
      }

      if (typeof authClientWithSessionApi.revokeSession !== 'function') {
        return authClient.multiSession.revoke({
          sessionToken: sessionRef,
        })
      }

      const payloadCandidates: Array<Record<string, string>> = [
        { token: sessionRef },
        { sessionToken: sessionRef },
        { sessionId: sessionRef },
        { id: sessionRef },
      ]

      let lastResult: unknown = null
      for (const payload of payloadCandidates) {
        const candidateResult = await authClientWithSessionApi.revokeSession(payload)
        const candidateError = readBetterAuthResultError(candidateResult, '')
        lastResult = candidateResult
        if (candidateError == null || candidateError.trim().length === 0) {
          return candidateResult
        }
      }

      return lastResult
    },
    [],
  )

  const revokeSessionByToken = async (sessionToken: string) => {
    if (!canEdit) {
      setSessionsMessage(null)
      return
    }

    setRevokingSessionToken(sessionToken)
    setSessionsMessage(null)

    try {
      const result = await revokeSessionWithFallbackKeys(sessionToken)
      const apiErrorMessage = readBetterAuthResultError(
        result,
        m.settings_security_sessions_error_revoke_default(),
      )
      if (apiErrorMessage != null) {
        setSessionsMessage(apiErrorMessage)
        return
      }

      setSessionsMessage(m.settings_security_sessions_success_revoke_one())
      await refreshActiveSessions()
    } catch (cause) {
      setSessionsMessage(getErrorMessage(cause, m.settings_security_sessions_error_revoke_default()))
    } finally {
      setRevokingSessionToken(null)
    }
  }

  const revokeAllOtherSessions = async () => {
    if (!canEdit) {
      setSessionsMessage(null)
      return
    }

    const otherSessions = activeSessions.filter((session) => !session.isCurrent)
    if (otherSessions.length === 0) {
      setSessionsMessage(m.settings_security_sessions_no_other_sessions())
      return
    }

    setRevokingAllOtherSessions(true)
    setSessionsMessage(null)

    try {
      for (const session of otherSessions) {
        const result = await revokeSessionWithFallbackKeys(session.sessionToken)
        const apiErrorMessage = readBetterAuthResultError(
          result,
          m.settings_security_sessions_error_revoke_default(),
        )
        if (apiErrorMessage != null) {
          setSessionsMessage(apiErrorMessage)
          return
        }
      }

      setSessionsMessage(m.settings_security_sessions_success_revoke_others())
      await refreshActiveSessions()
    } catch (cause) {
      setSessionsMessage(getErrorMessage(cause, m.settings_security_sessions_error_revoke_default()))
    } finally {
      setRevokingAllOtherSessions(false)
    }
  }

  return {
    activeSessions,
    sessionsLoaded,
    sessionsLoading,
    sessionsRefreshing,
    sessionsMessage,
    revokingSessionToken,
    revokingAllOtherSessions,
    refreshActiveSessions,
    revokeSessionByToken,
    revokeAllOtherSessions,
  }
}
