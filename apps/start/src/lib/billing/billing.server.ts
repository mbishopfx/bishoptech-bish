import { getRequestHeaders } from '@tanstack/react-start/server'
import { Effect } from 'effect'
import { WorkspaceBillingRuntime } from '@/lib/billing-backend/runtime/workspace-billing-runtime'
import {
  WorkspaceBillingMissingOrgContextError,
  WorkspaceBillingUnauthorizedError,
} from '@/lib/billing-backend/domain/errors'
import { WorkspaceBillingService } from '@/lib/billing-backend/services/workspace-billing.service'
import { requireOrgAuth } from '@/lib/server-effect/http/server-auth'
import type { StripeManagedWorkspacePlanId } from './plan-catalog'

export async function startWorkspaceSubscriptionCheckoutAction(input: {
  readonly planId: StripeManagedWorkspacePlanId
  readonly seats: number
}): Promise<{ url: string }> {
  return WorkspaceBillingRuntime.run(
    Effect.gen(function* () {
      const headers = getRequestHeaders()
      const authContext = yield* requireOrgAuth({
        headers,
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
      return yield* service.startCheckout({
        headers,
        organizationId: authContext.organizationId,
        userId: authContext.userId,
        planId: input.planId,
        seats: input.seats,
      })
    }),
  )
}

/**
 * Opens the Stripe billing portal for the authenticated workspace manager.
 */
export async function openWorkspaceBillingPortalAction(): Promise<{
  url: string
}> {
  return WorkspaceBillingRuntime.run(
    Effect.gen(function* () {
      const headers = getRequestHeaders()
      const authContext = yield* requireOrgAuth({
        headers,
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
      return yield* service.openBillingPortal({
        headers,
        organizationId: authContext.organizationId,
        userId: authContext.userId,
      })
    }),
  )
}
