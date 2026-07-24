import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(), // 4文字 大文字英数（紛らわしい文字除外）
    createdBy: v.string(), // Clerk userId
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.id("rooms"),
    userId: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"]),

  rounds: defineTable({
    roomId: v.id("rooms"),
    pitcherUserId: v.string(),
    pitcherName: v.string(),
    themeTech: v.string(),
    themeMarket: v.string(),
    themeModel: v.string(),
    status: v.union(v.literal("pitching"), v.literal("ended")),
    startedAt: v.number(), // Date.now()
    endedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_status", ["roomId", "status"]),

  investments: defineTable({
    roundId: v.id("rounds"),
    roomId: v.id("rooms"),
    investorUserId: v.string(),
    investorName: v.string(),
    amount: v.number(), // 1〜10 の整数（単位: 億円）
    comment: v.optional(v.string()),
  })
    .index("by_round", ["roundId"])
    .index("by_round_investor", ["roundId", "investorUserId"])
    .index("by_room", ["roomId"]),
});
