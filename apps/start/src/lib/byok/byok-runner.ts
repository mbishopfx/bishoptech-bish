import { Effect, Schema } from 'effect'
import { WorkspaceBillingService } from '@/lib/billing-backend/services/workspace-billing.service'
import { ByokExecutorService } from './services/byok-executor.service'
import { WorkOsOrgResolverService } from './services/workos-org-resolver.service'
import { ByokValidationError } from './domain/errors'
import { UpdateByokPayload } from './domain/schemas'
import type { ByokUpdateResult } from './domain/types'
import { ByokRuntime } from './runtime/byok-runtime'

/**
 * Validates input and runs the BYOK update Effect.
 */
export async function runUpdateByok(data: unknown): Promise<ByokUpdateResult> {
  const program = Effect.gen(function* () {
    const validated = yield* Schema.decodeUnknownEffect(UpdateByokPayload)(
      data,
    ).pipe(
      Effect.mapError(
        (parseError) =>
          new ByokValidationError({
            message: 'Invalid payload',
            issue: String(parseError),
          }),
      ),
    )
    const resolver = yield* WorkOsOrgResolverService
    const executor = yield* ByokExecutorService
    const organizationId = yield* resolver.getOrgWorkosId()
    const billing = yield* WorkspaceBillingService
    yield* billing.assertFeatureEnabled({
      organizationId,
      feature: 'byok',
    })
    return yield* executor.executeUpdate(organizationId, validated)
  })
  return ByokRuntime.run(program)
}
