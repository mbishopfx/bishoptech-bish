import { stripe } from '@/app/api/stripe';
import { workos } from '@/app/api/workos';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (req: NextRequest) => {
  const { userId, orgName, subscriptionLevel, organizationId: providedOrgId } = await req.json();

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

    // Map subscription level to Product ID
    const productIds: Record<string, string> = {
        plus: "prod_T19GxAJKJQf0z9",
        pro: "prod_T2fQCV6iP9Vo2b"
    };
    const productId = productIds[subscriptionLevel];

    let price;
    try {
       // Try lookup by product ID first if available
       if (productId) {
          const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 1,
          });
          if (prices.data.length > 0) {
             price = prices;
          }
       }
       
       // Fallback to lookup_keys if no price found by product ID
       if (!price || price.data.length === 0) {
          price = await stripe.prices.list({
            lookup_keys: [subscriptionLevel],
          });
       }

    } catch (error) {
      console.error(
        'Error retrieving price from Stripe. This is likely because the products and prices have not been created yet. Run the setup script `pnpm run setup` to automatically create them.',
        error,
      );
      return NextResponse.json({ error: 'Error retrieving price from Stripe' }, { status: 500 });
    }
    
    if (!price || !price.data || price.data.length === 0) {
        return NextResponse.json({ error: 'Price not found' }, { status: 400 });
    }

    const user = await workos.userManagement.getUser(userId);

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        workOSOrganizationId: targetOrganizationId,
      },
    });

    // Update WorkOS organization with Stripe customer ID
    await workos.organizations.updateOrganization({
      organization: targetOrganizationId,
      stripeCustomerId: customer.id,
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      billing_address_collection: 'auto',
      line_items: [
        {
          price: price.data[0].id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error(errorMessage, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};
