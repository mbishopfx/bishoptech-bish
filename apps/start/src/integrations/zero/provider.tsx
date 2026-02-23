import { ZeroProvider as ZeroProviderBase } from '@rocicorp/zero/react'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useMemo, useRef } from 'react'
import { schema } from './schema'
import { mutators } from './mutators'
import type { ZeroContext } from './schema'

const cacheURL = import.meta.env.VITE_ZERO_CACHE_URL

/**
 * Zero userID and context from WorkOS AuthKit. Each userID gets its own client storage.
 * Uses WorkOS user id (user.id) so it matches workos_id in Convex/Postgres.
 */
function useZeroAuth(): { userID: string; context: ZeroContext } {
  const auth = useAuth()
  const { user, loading } = auth
  const lastAuthenticatedUserIDRef = useRef<string | null>(null)

  /**
   * Keep the last authenticated id while AuthKit is briefly loading.
   * Without this, transient `user=null` states can swap Zero to `anonymous`,
   * creating a different local profile and causing cache cold-starts.
   */
  const userID = useMemo(() => {
    const currentUserID = user?.id
    if (currentUserID) {
      lastAuthenticatedUserIDRef.current = currentUserID
      return currentUserID
    }

    if (loading && lastAuthenticatedUserIDRef.current) {
      return lastAuthenticatedUserIDRef.current
    }

    return 'anonymous'
  }, [loading, user?.id])

  const organizationId =
    'organizationId' in auth && typeof auth.organizationId === 'string'
      ? auth.organizationId
      : undefined
  /**
   * ZeroProvider compares non-auth props by identity. A stable context object
   * prevents accidental Zero client recreation across route renders.
   */
  const context = useMemo<ZeroContext>(
    () => ({
      userID,
      orgWorkosId: organizationId?.trim() || undefined,
    }),
    [organizationId, userID],
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
