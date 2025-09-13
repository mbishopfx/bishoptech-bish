import {
  query,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserIdentity } from "./helpers/getUser";
import { extractOrganizationIdFromJWT } from "./helpers/quota";

// Plan quota configuration // Could remove and use stripe metadata to fetch plan details
const PLAN_QUOTAS = {
  plus: {
    standardQuotaLimit: 500,
    premiumQuotaLimit: 100,
  },
  pro: {
    standardQuotaLimit: 1500,
    premiumQuotaLimit: 300,
  },
} as const;

type PlanType = keyof typeof PLAN_QUOTAS;

// Get plan from lookup key
function getPlanFromLookupKey(lookupKey: string | null): PlanType | null {
  if (!lookupKey) return null;

  if (lookupKey === "plus") return "plus";
  if (lookupKey === "pro") return "pro";

  return null;
}

export const createOrganization = internalMutation({
  args: { workos_id: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("organizations", args);
  },
});

export const updateOrganization = internalMutation({
  args: {
    id: v.id("organizations"),
    patch: v.object({
      workos_id: v.optional(v.string()),
      name: v.optional(v.string()),
      stripeCustomerId: v.optional(v.string()),
      billingCycleStart: v.optional(v.number()),
      billingCycleEnd: v.optional(v.number()),
      plan: v.optional(v.union(v.literal("plus"), v.literal("pro"))),
      standardQuotaLimit: v.optional(v.number()),
      premiumQuotaLimit: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, args.patch);
  },
});

export const deleteOrganization = internalMutation({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

export const getByWorkOSId = internalQuery({
  args: { workos_id: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_workos_id", (q) => q.eq("workos_id", args.workos_id))
      .first();
    return organization;
  },
});

export const getByWorkOSIdPublic = internalQuery({
  args: { workos_id: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_workos_id", (q) => q.eq("workos_id", args.workos_id))
      .first();
    return organization;
  },
});

export const getOrganizationInfo = internalQuery({
  args: { workos_id: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_workos_id", (q) => q.eq("workos_id", args.workos_id))
      .first();

    if (!organization) {
      return null;
    }

    return {
      id: organization._id,
      workos_id: organization.workos_id,
      name: organization.name,
      plan: organization.plan,
      standardQuotaLimit: organization.standardQuotaLimit,
      premiumQuotaLimit: organization.premiumQuotaLimit,
      billingCycleStart: organization.billingCycleStart,
      billingCycleEnd: organization.billingCycleEnd,
      hasBillingCycle: !!(
        organization.billingCycleStart && organization.billingCycleEnd
      ),
    };
  },
});

export const setStripeCustomerIdByWorkOSId = internalMutation({
  args: { workos_id: v.string(), stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_workos_id", (q) => q.eq("workos_id", args.workos_id))
      .first();

    if (existing?._id) {
      await ctx.db.patch(existing._id, {
        stripeCustomerId: args.stripeCustomerId,
      });
      return existing._id;
    }

    return await ctx.db.insert("organizations", {
      workos_id: args.workos_id,
      name: "",
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const getOrganizationByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .first();
    return organization;
  },
});

export const syncStripeSubscriptionData = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    subscriptionData: v.object({
      subscriptionId: v.optional(v.string()),
      status: v.string(),
      priceId: v.optional(v.union(v.string(), v.null())),
      lookupKey: v.optional(v.union(v.string(), v.null())),
      billingCycleStart: v.optional(v.union(v.number(), v.null())),
      billingCycleEnd: v.optional(v.union(v.number(), v.null())),
      cancelAtPeriodEnd: v.optional(v.boolean()),
      paymentMethodBrand: v.optional(v.union(v.string(), v.null())),
      paymentMethodLast4: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .first();

    if (!organization) {
      throw new Error(
        `Organization not found for Stripe customer ID: ${args.stripeCustomerId}`,
      );
    }

    // Determine plan from lookup key
    const newPlan = getPlanFromLookupKey(
      args.subscriptionData.lookupKey || null,
    );

    // Check if plan changed or quotas need to be set for the first time
    const shouldUpdateQuotas =
      !organization.plan || organization.plan !== newPlan;

    const updateData: {
      subscriptionId?: string;
      subscriptionStatus?:
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "trialing"
        | "unpaid"
        | "none";
      priceId?: string;
      cancelAtPeriodEnd?: boolean;
      paymentMethodBrand?: string;
      paymentMethodLast4?: string;
      billingCycleStart?: number;
      billingCycleEnd?: number;
      plan?: "plus" | "pro";
      standardQuotaLimit?: number;
      premiumQuotaLimit?: number;
    } = {
      subscriptionId: args.subscriptionData.subscriptionId,
      subscriptionStatus: args.subscriptionData.status as
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "trialing"
        | "unpaid"
        | "none",
      priceId: args.subscriptionData.priceId || undefined,
      cancelAtPeriodEnd: args.subscriptionData.cancelAtPeriodEnd,
      paymentMethodBrand: args.subscriptionData.paymentMethodBrand || undefined,
      paymentMethodLast4: args.subscriptionData.paymentMethodLast4 || undefined,
      // Update billing cycle fields (used by quota system)
      billingCycleStart: args.subscriptionData.billingCycleStart || undefined,
      billingCycleEnd: args.subscriptionData.billingCycleEnd || undefined,
    };

    // Update plan and quotas only if plan changed
    if (shouldUpdateQuotas && newPlan) {
      updateData.plan = newPlan;
      updateData.standardQuotaLimit = PLAN_QUOTAS[newPlan].standardQuotaLimit;
      updateData.premiumQuotaLimit = PLAN_QUOTAS[newPlan].premiumQuotaLimit;
    }

    await ctx.db.patch(organization._id, updateData);
    return organization._id;
  },
});

export const syncStripeDataWithPeriod = internalAction({
  args: {
    stripeCustomerId: v.string(),
    billingPeriod: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      }),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    subscriptionId?: string;
    status: string;
    priceId?: string;
    billingCycleStart?: number;
    billingCycleEnd?: number;
    cancelAtPeriodEnd?: boolean;
    paymentMethodBrand?: string;
    paymentMethodLast4?: string;
  }> => {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    try {
      // Fetch latest subscription data from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: args.stripeCustomerId,
        limit: 1,
        status: "all",
        expand: ["data.default_payment_method", "data.items.data.price"],
      });

      let subscriptionData;

      if (subscriptions.data.length === 0) {
        subscriptionData = {
          status: "none",
          billingCycleStart: undefined,
          billingCycleEnd: undefined,
        };
      } else {
        const subscription = subscriptions.data[0];
        const price = subscription.items.data[0]?.price;
        const lookupKey = price?.lookup_key || null;

        subscriptionData = {
          subscriptionId: subscription.id,
          status: subscription.status,
          priceId: price?.id || null,
          lookupKey,
          billingCycleStart: subscription.items.data[0]?.current_period_start,
          billingCycleEnd: subscription.items.data[0]?.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          paymentMethodBrand:
            subscription.default_payment_method &&
            typeof subscription.default_payment_method !== "string"
              ? (
                  subscription.default_payment_method as {
                    card?: { brand?: string };
                  }
                ).card?.brand || null
              : null,
          paymentMethodLast4:
            subscription.default_payment_method &&
            typeof subscription.default_payment_method !== "string"
              ? (
                  subscription.default_payment_method as {
                    card?: { last4?: string };
                  }
                ).card?.last4 || null
              : null,
        };
      }

      // Store the data in Convex
      await ctx.runMutation(internal.organizations.syncStripeSubscriptionData, {
        stripeCustomerId: args.stripeCustomerId,
        subscriptionData,
      });

      // Convert null values to undefined for return type compatibility
      return {
        ...subscriptionData,
        priceId: subscriptionData.priceId || undefined,
        billingCycleStart: subscriptionData.billingCycleStart || undefined,
        billingCycleEnd: subscriptionData.billingCycleEnd || undefined,
        paymentMethodBrand: subscriptionData.paymentMethodBrand || undefined,
        paymentMethodLast4: subscriptionData.paymentMethodLast4 || undefined,
      };
    } catch (error) {
      console.error(
        "Failed to sync Stripe data for customer:",
        args.stripeCustomerId,
      );
      console.error("Error details:", error);
      throw error;
    }
  },
});

export const getSubscriptionData = internalQuery({
  args: { workos_id: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_workos_id", (q) => q.eq("workos_id", args.workos_id))
      .first();

    if (!organization) {
      return null;
    }

    return {
      subscriptionId: organization.subscriptionId,
      subscriptionStatus: organization.subscriptionStatus || "none",
      priceId: organization.priceId,
      plan: organization.plan,
      standardQuotaLimit: organization.standardQuotaLimit,
      premiumQuotaLimit: organization.premiumQuotaLimit,
      billingCycleStart: organization.billingCycleStart,
      billingCycleEnd: organization.billingCycleEnd,
      cancelAtPeriodEnd: organization.cancelAtPeriodEnd,
      paymentMethodBrand: organization.paymentMethodBrand,
      paymentMethodLast4: organization.paymentMethodLast4,
      stripeCustomerId: organization.stripeCustomerId,
    };
  },
});

export const getCurrentOrganizationPlan = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await getAuthUserIdentity(ctx);

      if (!identity) {
        return null;
      }

      const orgId = extractOrganizationIdFromJWT(identity);

      if (!orgId) {
        return null;
      }

      const organization = await ctx.db
        .query("organizations")
        .withIndex("by_workos_id", (q) => q.eq("workos_id", orgId))
        .first();

      if (!organization) {
        return null;
      }

      return {
        plan: organization.plan || null,
        subscriptionStatus: organization.subscriptionStatus || "none",
      };
    } catch (error) {
      console.error("Error getting current organization plan:", error);
      return null;
    }
  },
});

// Get current organization information for display
export const getCurrentOrganizationInfo = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await getAuthUserIdentity(ctx);

      if (!identity) {
        return null;
      }

      const orgId = extractOrganizationIdFromJWT(identity);

      if (!orgId) {
        return null;
      }

      const organization = await ctx.db
        .query("organizations")
        .withIndex("by_workos_id", (q) => q.eq("workos_id", orgId))
        .first();

      if (!organization) {
        return null;
      }

      return {
        name: organization.name,
        plan: organization.plan || null,
        subscriptionStatus: organization.subscriptionStatus || "none",
      };
    } catch (error) {
      console.error("Error getting current organization info:", error);
      return null;
    }
  },
});

// Get organization billing info - requires manage-billing permission
export const getOrganizationBillingInfo = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await getAuthUserIdentity(ctx);

      if (!identity) {
        return null;
      }

      // Check if user has manage-billing permission
      const permissions = identity.permissions as string[] | undefined;
      if (!permissions || !permissions.includes("manage-billing")) {
        return null;
      }

      const orgId = extractOrganizationIdFromJWT(identity);

      if (!orgId) {
        return null;
      }

      const organization = await ctx.db
        .query("organizations")
        .withIndex("by_workos_id", (q) => q.eq("workos_id", orgId))
        .first();

      if (!organization) {
        return null;
      }

      return {
        plan: organization.plan || null,
        billingCycleStart: organization.billingCycleStart,
        billingCycleEnd: organization.billingCycleEnd,
        subscriptionStatus: organization.subscriptionStatus || "none",
      };
    } catch (error) {
      console.error("Error getting organization billing info:", error);
      return null;
    }
  },
});

// Get total user count for organization
export const getOrganizationUserCount = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await getAuthUserIdentity(ctx);

      if (!identity) {
        return null;
      }

      const orgId = extractOrganizationIdFromJWT(identity);

      if (!orgId) {
        return null;
      }

      // Count users in the organization by checking all users with the same org_id
      // Note: This is a simple count based on the assumption that users belong to organizations
      // In a real WorkOS setup, you might need to query WorkOS API for accurate user counts
      const allUsers = await ctx.db.query("users").collect();

      // For now, return a placeholder count since we don't have org association in users table
      // You might need to implement proper org-user relationship or query WorkOS API
      return { totalUsers: allUsers.length };
    } catch (error) {
      console.error("Error getting organization user count:", error);
      return null;
    }
  },
});
