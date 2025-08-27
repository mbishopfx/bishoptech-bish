import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Use a default guest user ID for all users since we removed authentication
const GUEST_USER_ID = "guest-user";

// Create a new chat
export const createChat = mutation({
  args: {
    title: v.string(),
    uuid: v.optional(v.string()),
  },
  returns: v.id("chats"),
  handler: async (ctx, args) => {
    // Generate UUID if not provided
    const chatUuid = args.uuid || crypto.randomUUID();
    
    return await ctx.db.insert("chats", {
      title: args.title,
      userId: GUEST_USER_ID,
      pinned: false,
      uuid: chatUuid,
    });
  },
});

// Delete a chat
export const deleteChat = mutation({
  args: {
    uuid: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();
    
    if (!chat) {
      throw new Error("Chat not found");
    }
    
    // Delete all messages in the chat first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    
    // Delete the chat
    await ctx.db.delete(chat._id);
    return null;
  },
});

// Get a chat by ID
export const getChatById = query({
  args: {
    uuid: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("chats"),
      _creationTime: v.number(),
      title: v.string(),
      userId: v.string(),
      pinned: v.boolean(),
      uuid: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Query by UUID field instead of using the Convex ID
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .collect();
    
    return chats.length > 0 ? chats[0] : null;
  },
});

// Get chat history for the guest user
export const getChatHistory = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("chats"),
      _creationTime: v.number(),
      title: v.string(),
      userId: v.string(),
      pinned: v.boolean(),
      uuid: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Toggle chat pin status
export const toggleChatPin = mutation({
  args: {
    uuid: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();
    
    if (!chat) {
      throw new Error("Chat not found");
    }
    
    await ctx.db.patch(chat._id, {
      pinned: !chat.pinned,
    });
    return null;
  },
});
