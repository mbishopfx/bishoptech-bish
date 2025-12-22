import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { AuthMutation, AuthQuery } from "./helpers/authenticated";
import { extractOrganizationIdFromJWT } from "./helpers/quota";
import { ensureServerSecret } from "./helpers/auth";
import { Doc } from "./_generated/dataModel";

export const create = AuthMutation({
  args: {
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    iconColor: v.optional(v.string()),
    instructions: v.string(),
    isSharedWithOrg: v.boolean(),
    sharedWithUsers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = extractOrganizationIdFromJWT(ctx.identity);
    
    const id = await ctx.db.insert("customInstructions", {
      ...args,
      ownerId: ctx.identity.subject,
      orgId: orgId ?? undefined,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const update = AuthMutation({
  args: {
    id: v.id("customInstructions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    iconColor: v.optional(v.string()),
    instructions: v.optional(v.string()),
    isSharedWithOrg: v.optional(v.boolean()),
    sharedWithUsers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const instruction = await ctx.db.get(args.id);
    if (!instruction) {
      throw new Error("Instruction not found");
    }

    if (instruction.ownerId !== ctx.identity.subject) {
      throw new Error("Unauthorized");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = AuthMutation({
  args: {
    id: v.id("customInstructions"),
  },
  handler: async (ctx, args) => {
    const instruction = await ctx.db.get(args.id);
    if (!instruction) {
      throw new Error("Instruction not found");
    }

    if (instruction.ownerId !== ctx.identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const list = AuthQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.identity.subject;
    const orgId = extractOrganizationIdFromJWT(ctx.identity);

    // Get instructions owned by the user
    const myInstructions = await ctx.db
      .query("customInstructions")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // Get instructions shared with the org
    let orgInstructions: Doc<"customInstructions">[] = [];
    if (orgId) {
      orgInstructions = await ctx.db
        .query("customInstructions")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .filter((q) => q.eq(q.field("isSharedWithOrg"), true))
        .collect();
    }

    // Get instructions directly shared with the user (table scan, but small volume)
    const allInstructions = await ctx.db.query("customInstructions").collect();
    const sharedWithMeDirectly = allInstructions.filter(inst => 
      inst.ownerId !== userId && inst.sharedWithUsers.includes(userId)
    );

    // Merge and deduplicate
    const combined = [...myInstructions];
    
    const addToResult = (list: Doc<"customInstructions">[]) => {
      for (const inst of list) {
        if (!combined.some((i) => i._id === inst._id)) {
          combined.push(inst);
        }
      }
    };

    addToResult(orgInstructions);
    addToResult(sharedWithMeDirectly);
    
    // Fetch owner information for all
    const results = await Promise.all(
      combined.map(async (inst) => {
        const owner = await ctx.db
          .query("users")
          .withIndex("by_workos_id", (q) => q.eq("workos_id", inst.ownerId))
          .unique();
        
        return {
          ...inst,
          ownerName: owner 
            ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email 
            : "Usuario",
        };
      })
    );
    
    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = AuthQuery({
  args: {
    id: v.id("customInstructions"),
  },
  handler: async (ctx, args) => {
    const userId = ctx.identity.subject;
    const orgId = extractOrganizationIdFromJWT(ctx.identity);
    const instruction = await ctx.db.get(args.id);
    
    if (!instruction) {
      return null;
    }

    // Check access
    const isOwner = instruction.ownerId === userId;
    const isOrgMember = orgId && instruction.orgId === orgId && instruction.isSharedWithOrg;
    const isSharedUser = instruction.sharedWithUsers.includes(userId);

    if (!isOwner && !isOrgMember && !isSharedUser) {
      return null;
    }

    const owner = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workos_id", instruction.ownerId))
      .unique();

    return {
      ...instruction,
      ownerName: owner 
        ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email 
        : "Usuario",
    };
  },
});

export const serverGet = query({
  args: {
    id: v.id("customInstructions"),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    ensureServerSecret(args.secret);

    const instruction = await ctx.db.get(args.id);
    return instruction;
  },
});

export const incrementUsage = mutation({
  args: {
    id: v.id("customInstructions"),
  },
  handler: async (ctx, args) => {
    const instruction = await ctx.db.get(args.id);
    if (instruction) {
      await ctx.db.patch(args.id, {
        usageCount: (instruction.usageCount || 0) + 1,
      });
    }
  },
});

export const serverIncrementUsage = mutation({
  args: {
    id: v.id("customInstructions"),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    ensureServerSecret(args.secret);

    const instruction = await ctx.db.get(args.id);
    if (instruction) {
      await ctx.db.patch(args.id, {
        usageCount: (instruction.usageCount || 0) + 1,
      });
    }
  },
});
