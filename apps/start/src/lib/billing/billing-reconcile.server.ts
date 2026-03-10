import { getRequestHeaders } from '@tanstack/react-start/server'
import { Effect } from 'effect'
import {
  WorkspaceBillingMissingOrgContextError,
  WorkspaceBillingUnauthorizedError,
} from '@/lib/billing-backend/domain/errors'
import { WorkspaceBillingRuntime } from '@/lib/billing-backend/runtime/workspace-billing-runtime'
import { WorkspaceBillingService } from '@/lib/billing-backend/services/workspace-billing.service'
import { requireOrgAuth } from '@/lib/server-effect/http/server-auth'

/**
 * Recomputes the org entitlement snapshot after Stripe redirects so the billing
 * page can reflect the normalized subscription state immediately.
 */
export async function reconcileActiveWorkspaceBillingAction() {
  return WorkspaceBillingRuntime.run(
    Effect.gen(function* () {
      const authContext = yield* requireOrgAuth({
        headers: getRequestHeaders(),
        onUnauthorized: () =>
          new WorkspaceBillingUnauthorizedError({
            message: 'Unauthorized',
          }),
        onMissingOrg: () =>
          new WorkspaceBillingMissingOrgContextError({
            message: 'No active workspace selected',
          }),
      })
      const service = yield* WorkspaceBillingService
      return yield* service.recomputeEntitlementSnapshot({
        organizationId: authContext.organizationId,
      })
    }),
  )
}
