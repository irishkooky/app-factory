import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(), // 4文字の合言葉（A-Z/2-9、紛らわしい O,0,I,1 は除外）
    hostId: v.string(), // Clerk userId
    status: v.union(v.literal("lobby"), v.literal("playing"), v.literal("finished")),
    roundIndex: v.number(), // 現在のラウンド番号（未開始は -1）
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.id("rooms"),
    userId: v.string(),
    name: v.string(),
    totalRaised: v.number(), // 累計調達額（億円）
    order: v.number(), // 参加順（ピッチャーのローテーション用）
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"]),

  rounds: defineTable({
    roomId: v.id("rooms"),
    index: v.number(),
    pitcherId: v.string(),
    pitcherName: v.string(),
    theme: v.object({ target: v.string(), tech: v.string(), model: v.string() }),
    status: v.union(v.literal("open"), v.literal("closed")),
    startedAt: v.number(), // Date.now()（Convexサーバー側なので可）
    raised: v.number(), // closed 時に確定した調達額（open中は0）
  }).index("by_room_index", ["roomId", "index"]),

  investments: defineTable({
    roundId: v.id("rounds"),
    investorId: v.string(),
    investorName: v.string(),
    amount: v.number(), // 億円
    comment: v.string(), // 空文字可・最大50文字
  })
    .index("by_round", ["roundId"])
    .index("by_round_investor", ["roundId", "investorId"]),
});
