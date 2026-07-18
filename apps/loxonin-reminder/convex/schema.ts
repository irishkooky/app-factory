import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  devices: defineTable({
    deviceId: v.string(),
    subscription: v.optional(v.string()), // PushSubscription の JSON 文字列
    notifyAfterMinutes: v.number(), // デフォルト 210
    updatedAt: v.number(),
  }).index("by_deviceId", ["deviceId"]),

  doses: defineTable({
    deviceId: v.string(),
    takenAt: v.number(), // epoch ms
    notifyAt: v.number(), // epoch ms
    scheduledId: v.optional(v.id("_scheduled_functions")),
    notified: v.boolean(),
  }).index("by_device", ["deviceId", "takenAt"]),
});
