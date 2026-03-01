import { Effect, Layer, ServiceMap } from 'effect'
import { requireOrgAuth } from '@/lib/server-effect/http/server-auth.server'
import {
  ByokMissingOrgContextError,
  ByokUnauthorizedError,
} from '../domain/errors'

/**
 * Resolves the current organization's WorkOS ID from authenticated server context.
 */
export type WorkOsOrgResolverServiceShape = {
  readonly getOrgWorkosId: () => Effect.Effect<
    string,
    ByokUnauthorizedError | ByokMissingOrgContextError
  >
}

export class WorkOsOrgResolverService extends ServiceMap.Service<
  WorkOsOrgResolverService,
  WorkOsOrgResolverServiceShape
>()('byok/WorkOsOrgResolverService') {
  /**
   * Live resolver that binds WorkOS auth context to a typed BYOK service.
   */
  static readonly layer = Layer.succeed(this, {
    getOrgWorkosId: Effect.fn('WorkOsOrgResolverService.getOrgWorkosId')(() =>
      Effect.gen(function* () {
        const authContext = yield* requireOrgAuth({
          onUnauthorized: () =>
            new ByokUnauthorizedError({ message: 'Unauthorized' }),
          onMissingOrg: () =>
            new ByokMissingOrgContextError({
              message: 'Organization context is required.',
            }),
        })
        return authContext.orgWorkosId
      }),
    ),
  })
}
