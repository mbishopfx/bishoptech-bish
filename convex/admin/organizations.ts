import {
    internalQuery,
    internalMutation,
  } from "../_generated/server";
  import { v } from "convex/values";
  import { internal } from "../_generated/api";
  
  // Plan configurations for admin dashboard
  const ADMIN_PLAN_CONFIGS = {
    plus: {
      standardQuotaLimit: 1000,
      premiumQuotaLimit: 100,
    },
    pro: {
      standardQuotaLimit: 1500,
      premiumQuotaLimit: 300,
    },
  } as const;
    
  /**
   * List all organizations with their data for admin dashboard
   */
  export const listAllOrganizations = internalQuery({
    args: {},
    returns: v.array(
      v.object({
        _id: v.id("organizations"),
        _creationTime: v.number(),
        workos_id: v.string(),
        name: v.string(),
        plan: v.optional(v.union(v.literal("plus"), v.literal("pro"))),
        standardQuotaLimit: v.optional(v.number()),
        premiumQuotaLimit: v.optional(v.number()),
        billingCycleStart: v.optional(v.number()),
        billingCycleEnd: v.optional(v.number()),
        subscriptionStatus: v.optional(
          v.union(
            v.literal("active"),
            v.literal("canceled"),
            v.literal("incomplete"),
            v.literal("incomplete_expired"),
            v.literal("past_due"),
            v.literal("trialing"),
            v.literal("unpaid"),
            v.literal("none"),
          ),
        ),
        stripeCustomerId: v.optional(v.string()),
      }),
    ),
    handler: async (ctx) => {
      const organizations = await ctx.db.query("organizations").collect();
      
      return organizations;
    },
  });
  
  /**
   * Set organization plan and update quotas
   */
  export const setOrganizationPlan = internalMutation({
    args: {
      organizationId: v.id("organizations"),
      plan: v.union(v.literal("plus"), v.literal("pro")),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
      const organization = await ctx.db.get(args.organizationId);
      
      if (!organization) {
        throw new Error(`Organization not found: ${args.organizationId}`);
      }
  
      const planConfig = ADMIN_PLAN_CONFIGS[args.plan];
      const now = Date.now();
      const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
  
      await ctx.db.patch(args.organizationId, {
        plan: args.plan,
        standardQuotaLimit: planConfig.standardQuotaLimit,
        premiumQuotaLimit: planConfig.premiumQuotaLimit,
        billingCycleStart: now,
        billingCycleEnd: thirtyDaysFromNow,
        subscriptionStatus: "active", // Set as active when admin assigns plan
      });

      // Schedule the first billing cycle reset
      await ctx.scheduler.runAt(
        thirtyDaysFromNow,
        internal.organizations.resetOrganizationBillingCycle,
        { organizationId: args.organizationId }
      );
    },
  });
  
  
  /**
   * Get organization by ID for admin operations
   */
  export const getOrganizationById = internalQuery({
    args: {
      organizationId: v.id("organizations"),
    },
    returns: v.union(
      v.object({
        _id: v.id("organizations"),
        _creationTime: v.number(),
        workos_id: v.string(),
        name: v.string(),
        plan: v.optional(v.union(v.literal("plus"), v.literal("pro"))),
        standardQuotaLimit: v.optional(v.number()),
        premiumQuotaLimit: v.optional(v.number()),
        billingCycleStart: v.optional(v.number()),
        billingCycleEnd: v.optional(v.number()),
        subscriptionStatus: v.optional(
          v.union(
            v.literal("active"),
            v.literal("canceled"),
            v.literal("incomplete"),
            v.literal("incomplete_expired"),
            v.literal("past_due"),
            v.literal("trialing"),
            v.literal("unpaid"),
            v.literal("none"),
          ),
        ),
        stripeCustomerId: v.optional(v.string()),
      }),
      v.null(),
    ),
    handler: async (ctx, args) => {
      return await ctx.db.get(args.organizationId);
    },
  });