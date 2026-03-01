import { getAuth } from '@workos/authkit-tanstack-react-start'
import { Effect } from 'effect'
import type {
  AuthenticatedServerAuthContext,
  ServerAuthContext,
} from './auth-context'
import { extractServerAuthContext } from './auth-context'

export type OrgAuthenticatedServerAuthContext =
  AuthenticatedServerAuthContext & {
    readonly orgWorkosId: string
  }

/**
 * Reads and normalizes the WorkOS auth payload into the backend auth shape.
 */
export const getServerAuthContext = Effect.fn(
  'ServerAuth.getServerAuthContext',
)(
  (): Effect.Effect<ServerAuthContext> =>
    Effect.promise(() => getAuth()).pipe(Effect.map(extractServerAuthContext)),
)

/**
 * Requires an authenticated user and preserves optional organization context.
 */
export const requireUserAuth = Effect.fn('ServerAuth.requireUserAuth')(
  <TUnauthorized>(input: {
    readonly onUnauthorized: () => TUnauthorized
  }): Effect.Effect<AuthenticatedServerAuthContext, TUnauthorized> =>
    getServerAuthContext().pipe(
      Effect.flatMap((context) =>
        context.userId
          ? Effect.succeed({
              userId: context.userId,
              orgWorkosId: context.orgWorkosId,
            })
          : Effect.fail(input.onUnauthorized()),
      ),
    ),
)

/**
 * Requires both authenticated user context and an active organization context.
 */
export const requireOrgAuth = Effect.fn('ServerAuth.requireOrgAuth')(
  <TUnauthorized, TMissingOrg>(input: {
    readonly onUnauthorized: () => TUnauthorized
    readonly onMissingOrg: () => TMissingOrg
  }): Effect.Effect<
    OrgAuthenticatedServerAuthContext,
    TUnauthorized | TMissingOrg
  > =>
    requireUserAuth({ onUnauthorized: input.onUnauthorized }).pipe(
      Effect.flatMap((context) =>
        context.orgWorkosId
          ? Effect.succeed({
              userId: context.userId,
              orgWorkosId: context.orgWorkosId,
            })
          : Effect.fail(input.onMissingOrg()),
      ),
    ),
)
