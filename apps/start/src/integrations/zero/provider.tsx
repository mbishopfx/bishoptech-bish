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
import { readPublicRuntimeEnv } from '@/utils/public-runtime-env'
import { useZeroSelfHostedAccessToken } from './self-hosted-token'

function isZeroOptionalRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/setup' ||
    pathname === '/pricing' ||
    pathname.startsWith('/auth')
  )
}

function MissingZeroConfigurationState() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16 text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-[28px] border border-black/10 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
            BISH Sync Setup Required
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            The realtime data layer is not configured for this deployment.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-black/70">
            This app route depends on Rocicorp Zero. Set
            {' '}
            <code>VITE_ZERO_CACHE_URL</code>
            {' '}
            on the web service and point it at a running
            {' '}
            <code>zero-cache</code>
            {' '}
            service.
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-black/8 bg-black/[0.025] p-5 text-sm text-black/72">
          <p>
            Required web env:
            {' '}
            <code>VITE_APP_INSTANCE_MODE=self_hosted</code>
          </p>
          <p>
            Required web env:
            {' '}
            <code>VITE_ZERO_CACHE_URL=https://&lt;zero-cache-domain&gt;</code>
          </p>
          <p>
            Required service:
            {' '}
            <code>zero-cache</code>
            {' '}
            with
            {' '}
            <code>ZERO_QUERY_URL</code>
            {' '}
            and
            {' '}
            <code>ZERO_MUTATE_URL</code>
            {' '}
            targeting this BISH web app.
          </p>
        </div>
      </div>
    </main>
  )
}

/**
 * Zero identity derives from Better Auth sessions.
 * Anonymous users are provisioned with Better Auth anonymous sessions.
 */
function useZeroAuth(): {
  ready: boolean
  userID?: string
  context?: ZeroContext
} {
  const {
    user,
    loading,
    activeOrganizationId,
    isAnonymous,
    signInAnonymously,
  } = useAppAuth()
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

export default function ZeroProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const cacheURL = readPublicRuntimeEnv('VITE_ZERO_CACHE_URL')
  const { ready, userID, context } = useZeroAuth()
  const location = useLocation()
  const zeroOptionalRoute = isZeroOptionalRoute(location.pathname)
  const isPublicSelfHostedRoute = isSelfHosted && zeroOptionalRoute

  const zeroToken = useZeroSelfHostedAccessToken({
    enabled:
      Boolean(cacheURL) &&
      isSelfHosted &&
      !isPublicSelfHostedRoute &&
      ready &&
      Boolean(userID) &&
      Boolean(context),
    userID,
    organizationId: context?.organizationId,
  })

  if (!cacheURL) {
    if (zeroOptionalRoute) {
      return <>{children}</>
    }

    /**
     * Production deployments can accidentally boot the React tree without
     * Zero configured. Rendering a deliberate setup state prevents opaque
     * `useZero()` crashes deeper in the chat and settings surfaces.
     */
    return <MissingZeroConfigurationState />
  }

  if (isPublicSelfHostedRoute && (!ready || !userID || !context)) {
    return <>{children}</>
  }

  if (!ready || !userID || !context) {
    return null
  }

  if (isSelfHosted && (!zeroToken.ready || !zeroToken.token)) {
    return null
  }

  const zeroProviderKey = isSelfHosted
    ? `${userID}:${context.organizationId ?? 'personal'}:${zeroToken.token ?? 'missing'}`
    : `${userID}:${context.organizationId ?? 'personal'}:cookie`

  return (
    <ZeroProviderBase
      key={zeroProviderKey}
      userID={userID}
      context={context}
      cacheURL={cacheURL}
      {...(isSelfHosted ? { auth: zeroToken.token } : {})}
      schema={schema}
      mutators={mutators}
    >
      {children}
    </ZeroProviderBase>
  )
}
