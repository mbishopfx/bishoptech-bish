import { stripe } from '@/app/api/stripe';
import { workos } from '@/app/api/workos';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

export const POST = async (req: NextRequest) => {
  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = productionDomain ? `https://${productionDomain}` : "http://localhost:3000";

  const {
    userId,
    orgName,
    subscriptionLevel,
    organizationId: providedOrgId,
  } = await req.json();

  try {
    let targetOrganizationId = providedOrgId;

    // If no organization ID provided, try to find one or create one
    if (!targetOrganizationId) {
       // Check if user has existing memberships
       const memberships = await workos.userManagement.listOrganizationMemberships({
         userId,
       });

       if (memberships.data.length > 0) {
         // User has organizations, use the first one (or logic to pick "active" if possible)
         // Ideally frontend sends the active one, but this is a fallback.
         targetOrganizationId = memberships.data[0].organizationId;
       } else {
         // No existing organizations, create a new one
         if (!orgName) {
             return NextResponse.json({ error: 'Organization Name is required to create a new organization' }, { status: 400 });
         }
         const organization = await workos.organizations.createOrganization({
           name: orgName,
         });
         
         await workos.userManagement.createOrganizationMembership({
           organizationId: organization.id,
           userId,
           roleSlug: 'admin',
         });
         
         targetOrganizationId = organization.id;
       }
    }

    // Map subscription level to Price ID from env
    const priceIds: Record<string, string | undefined> = {
      free: process.env.FREE_PRICE_ID,
      plus: process.env.PLUS_PRICE_ID,
      pro: process.env.PRO_PRICE_ID,
    };
    const priceId = priceIds[subscriptionLevel];

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID not configured for this plan" },
        { status: 500 },
      );
    }

    const user = await workos.userManagement.getUser(userId);

    // Check if organization already has a Stripe customer ID
    const workosOrg = await workos.organizations.getOrganization(targetOrganizationId);
    let customerId = workosOrg.stripeCustomerId;

    // Create Stripe customer only if one doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: {
            workOSOrganizationId: targetOrganizationId,
          },
        },
        {
          idempotencyKey: `create_stripe_customer_${targetOrganizationId}`,
        },
      );
      customerId = customer.id;

      // Update WorkOS organization with Stripe customer ID
      await workos.organizations.updateOrganization({
        organization: targetOrganizationId,
        stripeCustomerId: customerId,
      });
    }

    // Sync Stripe customer ID to Convex organization
    try {
      const convexBase = process.env.CONVEX_SITE_URL;
      const secret = process.env.CONVEX_SYNC_SECRET;

      if (convexBase && secret) {
        await fetch(`${convexBase}/sync-stripe-customer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${secret}`,
          },
          body: JSON.stringify({
            workos_id: targetOrganizationId,
            stripeCustomerId: customerId,
          }),
        });
      } else {
        console.warn("CONVEX_SITE_URL or CONVEX_SYNC_SECRET not set, skipping Convex sync");
      }
    } catch (error) {
      // Log error but don't fail the subscription flow
      console.error("Failed to sync Stripe customer ID to Convex:", error);
    }

    // Handle FREE plan subscription immediately
    if (subscriptionLevel === 'free') {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });

        // If subscription is active (free plan usually is immediately active), return success
        // We don't need a checkout URL
        return NextResponse.json({ 
            success: true, 
            organizationId: targetOrganizationId,
            subscriptionId: subscription.id 
        });
    }

    // For paid plans, create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      billing_address_collection: 'auto',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/chat`,
      cancel_url: `${baseUrl}/`,
    });

    return NextResponse.json({ url: session.url, organizationId: targetOrganizationId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error(errorMessage, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};
