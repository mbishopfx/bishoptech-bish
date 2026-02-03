import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { parsePermissionsFromAccessToken, PERMISSIONS } from "@/lib/permissions";
import {
  DEFAULT_PRICING_CONTEXT,
  PlanSlug,
  PricingContext,
  SubscriptionPlan,
} from "@/lib/pricing-context";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<PricingContext>> {
  try {
    const session = await withAuth();
    if (!session?.accessToken) {
      return NextResponse.json(DEFAULT_PRICING_CONTEXT);
    }

    const permissions = parsePermissionsFromAccessToken(session.accessToken);
    const canManageBilling = permissions.has(PERMISSIONS.MANAGE_BILLING);

    const planInfo = await fetchQuery(
      api.organizations.getCurrentOrganizationPlan,
      {},
      { token: session.accessToken },
    );

    const productStatus = planInfo?.productStatus ?? null;
    const planValue = planInfo?.plan ?? null;
    const currentPlan = isSubscriptionPlan(planValue) ? planValue : null;

    const subscriptionIsActive =
      productStatus === "active" || productStatus === "trialing";
    let activePlan: PlanSlug | null = null;
    if (subscriptionIsActive && currentPlan && currentPlan !== "free") {
      activePlan = currentPlan;
    }

    return NextResponse.json({
      isAuthenticated: true,
      hasActiveSubscription: Boolean(activePlan),
      activePlan,
      canManageBilling,
      currentPlan,
    });
  } catch {
    return NextResponse.json(DEFAULT_PRICING_CONTEXT);
  }
}

function isSubscriptionPlan(plan: string | null | undefined): plan is SubscriptionPlan {
  return (
    plan === "free" || plan === "plus" || plan === "pro" || plan === "enterprise"
  );
}

