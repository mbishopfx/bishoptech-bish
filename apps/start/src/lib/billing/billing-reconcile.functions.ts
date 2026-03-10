import { createServerFn } from '@tanstack/react-start'

/**
 * The billing page can force a lightweight server-side reconciliation so the
 * UI reflects the latest Stripe-normalized subscription state without waiting
 * for a later org mutation.
 */
export const reconcileActiveWorkspaceBilling = createServerFn({ method: 'POST' })
  .handler(async () => {
    const { reconcileActiveWorkspaceBillingAction } = await import('./billing-reconcile.server')
    return reconcileActiveWorkspaceBillingAction()
  })
