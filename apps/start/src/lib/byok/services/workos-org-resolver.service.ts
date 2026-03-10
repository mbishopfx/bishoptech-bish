import { Effect, Layer, ServiceMap } from 'effect'
import {
  ByokMissingOrgContextError,
  ByokUnauthorizedError,
} from '../domain/errors'

/**
 * BYOK is disabled in this migration. Resolver is intentionally non-operational
 * until a non-WorkOS key management backend is introduced.
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
  static readonly layer = Layer.succeed(this, {
    getOrgWorkosId: Effect.fn('WorkOsOrgResolverService.getOrgWorkosId')(() =>
      Effect.fail(
        new ByokUnauthorizedError({
          message: 'BYOK is disabled for this deployment.',
        }),
      ),
    ),
  })
}
