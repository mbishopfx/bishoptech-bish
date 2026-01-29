import { workos } from '@/app/api/workos';
import { NextRequest, NextResponse } from 'next/server';

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
    let isExistingOrg = false;

    // If no organization ID provided, try to find one or create one (WorkOS only, no Stripe)
    if (!targetOrganizationId) {
      const memberships = await workos.userManagement.listOrganizationMemberships({
        userId,
      });

      if (memberships.data.length > 0) {
        targetOrganizationId = memberships.data[0].organizationId;
        isExistingOrg = true;
      } else {
        if (!orgName) {
          return NextResponse.json({ error: 'Organization Name is required to create a new organization' }, { status: 400 });
        }
        if (orgName.length > 50) {
          return NextResponse.json({ error: 'Organization Name must be at most 50 characters' }, { status: 400 });
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
    } else {
      isExistingOrg = true;
    }

    const level = String(subscriptionLevel ?? "").toLowerCase();

    // Free plan: redirect to chat (no checkout)
    if (level === "free") {
      return NextResponse.json({
        success: true,
        organizationId: targetOrganizationId,
        url: `${baseUrl}/chat`,
      });
    }

    // Paid plans (plus, pro): client will run Autumn checkout on subscribe page
    if (level === "plus" || level === "pro") {
      return NextResponse.json({
        organizationId: targetOrganizationId,
      });
    }

    return NextResponse.json(
      { error: "Invalid subscription plan" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error(errorMessage, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};
