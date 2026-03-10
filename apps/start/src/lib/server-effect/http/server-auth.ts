import { Effect } from 'effect'
import type {
  AuthenticatedServerAuthContext,
} from './auth-context'
import { extractServerAuthContext } from './auth-context'
import { getSessionFromHeaders } from '@/lib/auth/server-session.server'

export type OrgAuthenticatedServerAuthContext =
  AuthenticatedServerAuthContext & {
    readonly organizationId: string
  }

/**
 * Reads and normalizes the Better Auth session payload into backend auth shape.
 */
export const getServerAuthContext = Effect.fn(
  'ServerAuth.getServerAuthContext',
)(
  () =>
    Effect.promise(async () => {
      const headers = new Headers()
      return extractServerAuthContext(await getSessionFromHeaders(headers))
    }),
)

/**
 * Reads auth context from route request headers.
 */
export const getServerAuthContextFromHeaders = Effect.fn(
  'ServerAuth.getServerAuthContextFromHeaders',
)((headers: Headers) =>
  Effect.promise(async () =>
    extractServerAuthContext(await getSessionFromHeaders(headers)),
  ),
)

/**
 * Requires an authenticated user and preserves optional organization context.
 */
export const requireUserAuth = Effect.fn('ServerAuth.requireUserAuth')(
  <TUnauthorized>(input: {
    readonly headers: Headers
    readonly onUnauthorized: () => TUnauthorized
  }): Effect.Effect<AuthenticatedServerAuthContext, TUnauthorized> =>
    getServerAuthContextFromHeaders(input.headers).pipe(
      Effect.flatMap((context) =>
        context.userId
          ? Effect.succeed({
              userId: context.userId,
              organizationId: context.organizationId,
              isAnonymous: context.isAnonymous,
            })
          : Effect.fail(input.onUnauthorized()),
      ),
    ),
)

/**
 * Requires an authenticated non-anonymous user.
 */
export const requireNonAnonymousUserAuth = Effect.fn(
  'ServerAuth.requireNonAnonymousUserAuth',
)(
  <TUnauthorized>(input: {
    readonly headers: Headers
    readonly onUnauthorized: () => TUnauthorized
  }): Effect.Effect<AuthenticatedServerAuthContext, TUnauthorized> =>
    requireUserAuth({ headers: input.headers, onUnauthorized: input.onUnauthorized }).pipe(
      Effect.flatMap((context) =>
        context.isAnonymous
          ? Effect.fail(input.onUnauthorized())
          : Effect.succeed(context),
      ),
    ),
)

/**
 * Requires both authenticated user context and an active organization context.
 */
export const requireOrgAuth = Effect.fn('ServerAuth.requireOrgAuth')(
  <TUnauthorized, TMissingOrg>(input: {
    readonly headers: Headers
    readonly onUnauthorized: () => TUnauthorized
    readonly onMissingOrg: () => TMissingOrg
  }): Effect.Effect<
    OrgAuthenticatedServerAuthContext,
    TUnauthorized | TMissingOrg
  > =>
    requireNonAnonymousUserAuth({
      headers: input.headers,
      onUnauthorized: input.onUnauthorized,
    }).pipe(
      Effect.flatMap((context) =>
        context.organizationId
          ? Effect.succeed({
              userId: context.userId,
              organizationId: context.organizationId,
              isAnonymous: context.isAnonymous,
            })
          : Effect.fail(input.onMissingOrg()),
      ),
    ),
)
