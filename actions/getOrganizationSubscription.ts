'use server';

import { withAuth } from '@workos-inc/authkit-nextjs';
import { workos } from '@/app/api/workos';
import { stripe } from '@/app/api/stripe';

async function getStripeCustomerId(): Promise<string | null> {
  const { organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId) return null;
  const org = await workos.organizations.getOrganization(organizationId);
  return (org as any).stripe_customer_id || (org as any).stripeCustomerId || null;
}

export async function getOrganizationPlanName(): Promise<string | null> {
  const stripeCustomerId = await getStripeCustomerId();
  if (!stripeCustomerId) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    limit: 3,
    expand: ['data.items.data.price'],
  });
  const sub = subscriptions.data.find((s) => s.status === 'active') || subscriptions.data[0];
  if (!sub) return null;

  const price = sub.items.data[0]?.price ?? null;
  if (!price) return null;

  if (typeof price.product === 'string') {
    try {
      const product = await stripe.products.retrieve(price.product);
      return product.name ?? price.nickname ?? (price as any).lookup_key ?? price.id ?? null;
    } catch {
      return price.nickname ?? (price as any).lookup_key ?? price.id ?? null;
    }
  } else {
    return (price.product as any)?.name ?? price.nickname ?? (price as any).lookup_key ?? price.id ?? null;
  }
}

export type OrganizationBillingCycle = {
  currentPeriodStart: number; // unix seconds
  currentPeriodEnd: number;   // unix seconds
};

export async function getOrganizationBillingCycle(): Promise<OrganizationBillingCycle | null> {
  const stripeCustomerId = await getStripeCustomerId();
  if (!stripeCustomerId) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
    limit: 1,
  });
  const sub = subscriptions.data[0];
  if (!sub) return null;

  let start = (sub as any)["current_period_start"] as number | undefined;
  let end = (sub as any)["current_period_end"] as number | undefined;

  if (!start || !end) {
    const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 1 });
    const inv = invoices.data[0];
    const linePeriod = inv?.lines?.data?.[0]?.period;
    if (linePeriod?.start && linePeriod?.end) {
      start = linePeriod.start;
      end = linePeriod.end;
    }
  }

  if (!start || !end) {
    const recentInvoices = await stripe.invoices.list({ customer: stripeCustomerId, limit: 1 });
    const recent = recentInvoices.data[0];
    const linePeriod = recent?.lines?.data?.[0]?.period;
    if (linePeriod?.start && linePeriod?.end) {
      start = start ?? linePeriod.start;
      end = end ?? linePeriod.end;
    }
  }

  if (!start || !end) return null;
  return { currentPeriodStart: start, currentPeriodEnd: end };
}


