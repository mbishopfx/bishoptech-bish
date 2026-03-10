import { ZeroProvider as ZeroProviderBase } from '@rocicorp/zero/react'
import { useEffect, useMemo, useRef } from 'react'
import { schema } from './schema'
import { mutators } from './mutators'
import type { ZeroContext } from './schema'
import { useAppAuth } from '@/lib/auth/use-auth'

const cacheURL = import.meta.env.VITE_ZERO_CACHE_URL

/**
 * Zero identity derives from Better Auth sessions.
 * Anonymous users are provisioned with Better Auth anonymous sessions.
 */
function useZeroAuth(): { userID: string; context: ZeroContext } {
  const { user, loading, activeOrganizationId, isAnonymous, signInAnonymously } =
    useAppAuth()
  const lastAuthenticatedUserIDRef = useRef<string | null>(null)
  const anonymousBootstrapRef = useRef(false)

  useEffect(() => {
    if (loading || user || anonymousBootstrapRef.current) return
    anonymousBootstrapRef.current = true
    void signInAnonymously().finally(() => {
      anonymousBootstrapRef.current = false
    })
  }, [loading, signInAnonymously, user])

  const userID = useMemo(() => {
    const currentUserID = user?.id
    if (currentUserID) {
      lastAuthenticatedUserIDRef.current = currentUserID
      return currentUserID
    }

    if (loading && lastAuthenticatedUserIDRef.current) {
      return lastAuthenticatedUserIDRef.current
    }

    return 'anonymous-bootstrap'
  }, [loading, user?.id])

  const context = useMemo<ZeroContext>(
    () => ({
      userID,
      organizationId: activeOrganizationId?.trim() || undefined,
      isAnonymous,
    }),
    [activeOrganizationId, isAnonymous, userID],
  )

  return { userID, context }
}

export default function ZeroProvider({ children }: { children: React.ReactNode }) {
  const { userID, context } = useZeroAuth()

  if (!cacheURL) {
    return <>{children}</>
  }

  return (
    <ZeroProviderBase
      userID={userID}
      context={context}
      cacheURL={cacheURL}
      schema={schema}
      mutators={mutators}
    >
      {children}
    </ZeroProviderBase>
  )
}
