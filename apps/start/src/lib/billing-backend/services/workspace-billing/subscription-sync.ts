import type { Subscription as BetterAuthStripeSubscription } from '@better-auth/stripe'
import type Stripe from 'stripe'
import { recomputeEntitlementSnapshotRecord } from './entitlement'
import {
  markOrgBillingAccountStatus,
  markOrgSubscriptionCanceled,
  upsertOrgBillingAccount,
  upsertOrgSubscription,
} from './persistence'

export async function syncWorkspaceSubscriptionRecord(input: {
  subscription: BetterAuthStripeSubscription
  stripeSubscription?: Stripe.Subscription
  billingProvider?: 'stripe' | 'manual'
}): Promise<void> {
  const organizationId = input.subscription.referenceId
  const provider = input.billingProvider ?? 'stripe'
  const now = Date.now()
  const billingAccountId = `billing_${organizationId}`
  const subscriptionId = `workspace_subscription_${organizationId}`
  const seatCount = input.subscription.seats ?? 1
  const periodStart
    = input.subscription.periodStart instanceof Date
      ? input.subscription.periodStart.getTime()
      : null
  const periodEnd
    = input.subscription.periodEnd instanceof Date
      ? input.subscription.periodEnd.getTime()
      : null

  await upsertOrgBillingAccount({
    billingAccountId,
    organizationId,
    provider,
    providerCustomerId: input.subscription.stripeCustomerId ?? null,
    status: input.subscription.status,
    now,
  })

  await upsertOrgSubscription({
    subscriptionId,
    organizationId,
    billingAccountId,
    providerSubscriptionId: input.subscription.stripeSubscriptionId ?? null,
    planId: input.subscription.plan,
    billingInterval: input.subscription.billingInterval ?? 'month',
    seatCount,
    status: input.subscription.status,
    periodStart,
    periodEnd,
    cancelAtPeriodEnd: input.subscription.cancelAtPeriodEnd ?? false,
    metadata: {
      stripeSubscriptionStatus: input.stripeSubscription?.status ?? null,
    },
    now,
  })

  await recomputeEntitlementSnapshotRecord(organizationId)
}

export async function markWorkspaceSubscriptionCanceledRecord(input: {
  subscription: BetterAuthStripeSubscription
}): Promise<void> {
  const organizationId = input.subscription.referenceId
  const now = Date.now()

  await markOrgSubscriptionCanceled({
    organizationId,
    status: input.subscription.status,
    cancelAtPeriodEnd: input.subscription.cancelAtPeriodEnd ?? false,
    now,
  })

  await markOrgBillingAccountStatus({
    organizationId,
    status: input.subscription.status,
    now,
  })

  await recomputeEntitlementSnapshotRecord(organizationId)
}
