export type StripeSubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid"
  | "none";

export interface OrganizationSubscription {
  subscriptionId?: string;
  subscriptionStatus: StripeSubscriptionStatus;
  priceId?: string;
  billingCycleStart?: number;
  billingCycleEnd?: number;
  cancelAtPeriodEnd?: boolean;
  paymentMethodBrand?: string;
  paymentMethodLast4?: string;
  stripeCustomerId?: string;
}
