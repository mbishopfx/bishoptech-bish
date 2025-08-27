import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";

// Define rate limits for different actions
const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Limit chat messages per user to prevent spam
  // Allow 10 messages per minute with capacity for 3 burst messages
  sendMessage: { 
    kind: "token bucket", 
    rate: 10, 
    period: MINUTE, 
    capacity: 3 
  },
  // Global rate limit for new chat creation
  createChat: { 
    kind: "fixed window", 
    rate: 100, 
    period: HOUR 
  },
});

// Function to check and consume rate limit for sending messages
export const checkMessageRateLimit = action({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    retryAfter: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const status = await rateLimiter.limit(ctx, "sendMessage", { 
      key: args.userId 
    });
    
    return {
      ok: status.ok,
      retryAfter: status.retryAfter,
    };
  },
});

// Function to check and consume rate limit for creating chats
export const checkChatCreationRateLimit = action({
  args: {},
  returns: v.object({
    ok: v.boolean(),
    retryAfter: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const status = await rateLimiter.limit(ctx, "createChat");
    
    return {
      ok: status.ok,
      retryAfter: status.retryAfter,
    };
  },
});

// Function to get current rate limit status without consuming
export const getMessageRateLimitStatus = action({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    retryAfter: v.optional(v.number()),
    value: v.number(),
    config: v.any(),
    ts: v.number(),
  }),
  handler: async (ctx, args) => {
    const status = await rateLimiter.check(ctx, "sendMessage", { 
      key: args.userId 
    });
    
    const { config, value, ts } = await rateLimiter.getValue(ctx, "sendMessage", { 
      key: args.userId 
    });
    
    return {
      ok: status.ok,
      retryAfter: status.retryAfter,
      value,
      config,
      ts,
    };
  },
}); 