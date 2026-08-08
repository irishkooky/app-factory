import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  members: defineTable({
    name: v.string(),
    emoji: v.string(),
    isBot: v.boolean(),
  }),
  channels: defineTable({
    name: v.string(),
    description: v.string(),
    emoji: v.string(),
  }),
  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.id("members"),
    body: v.string(),
  }).index("by_channel", ["channelId"]),
  reactions: defineTable({
    messageId: v.id("messages"),
    memberId: v.id("members"),
    emoji: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_member_emoji", ["messageId", "memberId", "emoji"]),
});
