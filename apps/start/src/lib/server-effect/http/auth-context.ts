import { Effect } from 'effect'

/**
 * Minimal auth view used across server routes.
 * Keeps framework-specific auth payloads at the boundary.
 */
export type ServerAuthContext = {
  readonly userId?: string
  readonly organizationId?: string
  readonly isAnonymous: boolean
}

export type AuthenticatedServerAuthContext = {
  readonly userId: string
  readonly organizationId?: string
  readonly isAnonymous: boolean
}

/**
 * Extracts normalized user + org identifiers from Better Auth session results.
 */
export function extractServerAuthContext(auth: unknown): ServerAuthContext {
  if (!auth || typeof auth !== 'object') {
    return { isAnonymous: false }
  }

  const record = auth as {
    user?: { id?: unknown; isAnonymous?: unknown } | null
    session?: { activeOrganizationId?: unknown } | null
  }

  const userId =
    record.user && typeof record.user.id === 'string' && record.user.id.trim().length > 0
      ? record.user.id
      : undefined

  const organizationId =
    record.session && typeof record.session.activeOrganizationId === 'string'
      ? record.session.activeOrganizationId.trim() || undefined
      : undefined

  return {
    userId,
    organizationId,
    isAnonymous:
      !!record.user &&
      typeof record.user.isAnonymous === 'boolean' &&
      record.user.isAnonymous,
  }
}

/**
 * Normalizes auth payloads and enforces the presence of an authenticated user.
 * Callers provide a domain-specific unauthorized error constructor.
 */
export const requireAuthenticatedServerAuthContext = Effect.fn(
  'AuthContext.requireAuthenticatedServerAuthContext',
)(
  <TError>(input: {
    readonly auth: unknown
    readonly onUnauthorized: () => TError
  }): Effect.Effect<AuthenticatedServerAuthContext, TError> => {
    const context = extractServerAuthContext(input.auth)
    if (!context.userId) {
      return Effect.fail(input.onUnauthorized())
    }
    return Effect.succeed({
      userId: context.userId,
      organizationId: context.organizationId,
      isAnonymous: context.isAnonymous,
    })
  },
)
