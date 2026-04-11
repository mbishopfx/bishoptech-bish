import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { StripeManagedWorkspacePlanId } from '@/lib/shared/access-control'
import { isSelfHosted } from '@/utils/app-feature-flags'

const CheckoutPlanSchema = z.enum(['plus', 'pro', 'scale'])

const StartSubscriptionCheckoutInputSchema = z.object({
  planId: CheckoutPlanSchema,
  seats: z.number().int().min(1).max(500),
})
const ManagedWorkspacePlanSchema = z.enum(['free', 'plus', 'pro', 'scale'])
const ChangeWorkspaceSubscriptionInputSchema = z.object({
  targetPlanId: ManagedWorkspacePlanSchema,
  seats: z.number().int().min(1).max(500).optional(),
})

const OpenBillingPortalInputSchema = z.object({}).optional()

/**
 * Billing mutations remain thin TanStack Start server functions. The runtime
 * owns all orchestration so these handlers only extract trusted session input.
 */
export const startWorkspaceSubscriptionCheckout = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => StartSubscriptionCheckoutInputSchema.parse(input))
  .handler(async ({ data }) => {
    if (isSelfHosted) {
      throw new Error('Cloud billing is disabled for this self-hosted instance.')
    }

    const { startWorkspaceSubscriptionCheckoutAction } = await import('./billing.server')
    return startWorkspaceSubscriptionCheckoutAction({
      planId: data.planId as StripeManagedWorkspacePlanId,
      seats: data.seats,
    })
  })

export const changeWorkspaceSubscription = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => ChangeWorkspaceSubscriptionInputSchema.parse(input))
  .handler(async ({ data }) => {
    if (isSelfHosted) {
      throw new Error('Cloud billing is disabled for this self-hosted instance.')
    }

    const { changeWorkspaceSubscriptionAction } = await import('./billing.server')
    return changeWorkspaceSubscriptionAction({
      targetPlanId: data.targetPlanId,
      seats: data.seats,
    })
  })

export const openWorkspaceBillingPortal = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => OpenBillingPortalInputSchema.parse(input))
  .handler(async () => {
    if (isSelfHosted) {
      throw new Error('Cloud billing is disabled for this self-hosted instance.')
    }

    const { openWorkspaceBillingPortalAction } = await import('./billing.server')
    return openWorkspaceBillingPortalAction()
  })
