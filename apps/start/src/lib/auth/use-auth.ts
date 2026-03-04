import { useCallback, useMemo } from 'react'
import { authClient } from './auth-client'

export type AppAuthUser = {
  id: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  profilePictureUrl?: string | null
  isAnonymous?: boolean | null
}

/**
 * Better Auth returns this when an already-anonymous session attempts
 * another anonymous sign-in (common in React StrictMode double effects).
 * Treat it as idempotent so bootstrap callers can safely retry.
 */
const ANONYMOUS_ALREADY_SIGNED_IN_CODE =
  'ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY'

type UnknownErrorWithCode = {
  code?: unknown
  body?: { code?: unknown }
  cause?: { code?: unknown; body?: { code?: unknown } }
}

function isAnonymousAlreadySignedInError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as UnknownErrorWithCode
  const code =
    candidate.code ??
    candidate.body?.code ??
    candidate.cause?.code ??
    candidate.cause?.body?.code
  return code === ANONYMOUS_ALREADY_SIGNED_IN_CODE
}

/**
 * Compatibility auth hook used by existing UI while we migrate from AuthKit.
 */
export function useAppAuth() {
  const sessionQuery = authClient.useSession()
  const activeOrganizationQuery =
    'useActiveOrganization' in authClient &&
    typeof authClient.useActiveOrganization === 'function'
      ? authClient.useActiveOrganization()
      : { data: null }

  const user = useMemo<AppAuthUser | null>(() => {
    const next = sessionQuery.data?.user
    if (!next) return null
    return {
      id: next.id,
      email: next.email,
      firstName:
        'firstName' in next && typeof next.firstName === 'string'
          ? next.firstName
          : null,
      lastName:
        'lastName' in next && typeof next.lastName === 'string'
          ? next.lastName
          : null,
      profilePictureUrl:
        'image' in next && typeof next.image === 'string' ? next.image : null,
      isAnonymous:
        'isAnonymous' in next && typeof next.isAnonymous === 'boolean'
          ? next.isAnonymous
          : null,
    }
  }, [sessionQuery.data?.user])

  const organizationId =
    (sessionQuery.data?.session as { activeOrganizationId?: string } | undefined)
      ?.activeOrganizationId ??
    (activeOrganizationQuery.data as { id?: string } | null)?.id

  const signOut = useCallback(async () => {
    await authClient.signOut()
    await sessionQuery.refetch()
  }, [sessionQuery])

  const signInAnonymously = useCallback(async () => {
    try {
      await authClient.signIn.anonymous()
    } catch (error) {
      if (!isAnonymousAlreadySignedInError(error)) {
        throw error
      }
    }
    await sessionQuery.refetch()
  }, [sessionQuery])

  return {
    user,
    loading: sessionQuery.isPending,
    session: sessionQuery.data?.session,
    organizationId,
    signOut,
    signInAnonymously,
  }
}
