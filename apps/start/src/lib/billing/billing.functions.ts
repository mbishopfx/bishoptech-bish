import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { StripeManagedWorkspacePlanId } from './plan-catalog'

const CheckoutPlanSchema = z.enum(['plus', 'pro', 'scale'])

const StartSubscriptionCheckoutInputSchema = z.object({
  planId: CheckoutPlanSchema,
  seats: z.number().int().min(1).max(500),
})

const OpenBillingPortalInputSchema = z.object({}).optional()

/**
 * Billing mutations remain thin TanStack Start server functions. The runtime
 * owns all orchestration so these handlers only extract trusted session input.
 */
export const startWorkspaceSubscriptionCheckout = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => StartSubscriptionCheckoutInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { startWorkspaceSubscriptionCheckoutAction } = await import('./billing.server')
    return startWorkspaceSubscriptionCheckoutAction({
      planId: data.planId as StripeManagedWorkspacePlanId,
      seats: data.seats,
    })
  })

export const openWorkspaceBillingPortal = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => OpenBillingPortalInputSchema.parse(input))
  .handler(async () => {
    const { openWorkspaceBillingPortalAction } = await import('./billing.server')
    return openWorkspaceBillingPortalAction()
  })
