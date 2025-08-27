import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    title: v.string(),
    userId: v.string(),
    pinned: v.boolean(),
    uuid: v.string(), // Add UUID field for external references
  }).index("by_user", ["userId"]).index("by_uuid", ["uuid"]),

  messages: defineTable({
    chatId: v.id("chats"),
    role: v.string(),
    parts: v.any(), // JSON field for message parts
    annotations: v.any(), // JSON field for annotations
  }).index("by_chat", ["chatId"]),
});
