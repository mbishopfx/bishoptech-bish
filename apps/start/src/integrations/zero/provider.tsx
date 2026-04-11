import { ZeroProvider as ZeroProviderBase } from '@rocicorp/zero/react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import { schema } from './schema'
import { mutators } from './mutators'
import type { ZeroContext } from './schema'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import { resolveZeroAuthSnapshot } from './zero-auth'
import type { ZeroAuthSnapshot } from './zero-auth'
import { isSelfHosted } from '@/utils/app-feature-flags'

const cacheURL = import.meta.env.VITE_ZERO_CACHE_URL

/**
 * Zero identity derives from Better Auth sessions.
 * Anonymous users are provisioned with Better Auth anonymous sessions.
 */
function useZeroAuth(): { ready: boolean; userID?: string; context?: ZeroContext } {
  const { user, loading, activeOrganizationId, isAnonymous, signInAnonymously } =
    useAppAuth()
  const lastSnapshotRef = useRef<ZeroAuthSnapshot | null>(null)
  const anonymousBootstrapRef = useRef(false)

  useEffect(() => {
    if (isSelfHosted || loading || user || anonymousBootstrapRef.current) return
    anonymousBootstrapRef.current = true
    void signInAnonymously().finally(() => {
      anonymousBootstrapRef.current = false
    })
  }, [loading, signInAnonymously, user])

  return useMemo(() => {
    const resolved = resolveZeroAuthSnapshot({
      userId: user?.id,
      isAnonymous,
      activeOrganizationId,
      loading,
      lastSnapshot: lastSnapshotRef.current,
    })

    if (resolved.snapshot) {
      lastSnapshotRef.current = resolved.snapshot
      return {
        ready: true,
        userID: resolved.snapshot.userID,
        context: resolved.snapshot.context,
      }
    }

    return { ready: false }
  }, [activeOrganizationId, isAnonymous, loading, user?.id])
}

export default function ZeroProvider({ children }: { children: React.ReactNode }) {
  const { ready, userID, context } = useZeroAuth()
  const location = useLocation()

  const isPublicSelfHostedRoute =
    isSelfHosted &&
    (
      location.pathname === '/' ||
      location.pathname === '/setup' ||
      location.pathname === '/pricing' ||
      location.pathname.startsWith('/auth')
    )

  if (!cacheURL) {
    return <>{children}</>
  }

  if (isPublicSelfHostedRoute && (!ready || !userID || !context)) {
    return <>{children}</>
  }

  if (!ready || !userID || !context) {
    return null
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
