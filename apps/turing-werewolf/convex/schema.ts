import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(), // 4桁の数字
    phase: v.union(
      v.literal("lobby"),
      v.literal("answering"),
      v.literal("reveal"),
      v.literal("discussion"),
      v.literal("voting"),
      v.literal("result"),
    ),
    roundIndex: v.number(), // 0 始まり
    totalRounds: v.number(), // MVPでは 1 で作成
    promptText: v.optional(v.string()), // 現ラウンドのお題
    deadlineAt: v.optional(v.number()), // ms epoch（MVPでは未使用のままでよい）
  }).index("by_code", ["code"]),

  seats: defineTable({
    roomId: v.id("rooms"),
    alias: v.string(),
    order: v.number(), // 表示順。startGameで必ずシャッフルして振り直す
  }).index("by_room", ["roomId"]),

  // ❌ 公開クエリから返してはならない
  roomSecrets: defineTable({
    roomId: v.id("rooms"),
    aiSeatId: v.id("seats"),
  }).index("by_room", ["roomId"]),

  // ❌ 公開クエリから返してはならない（getMySeat の自席返却のみ例外）
  seatOwners: defineTable({
    roomId: v.id("rooms"),
    seatId: v.id("seats"),
    deviceId: v.string(),
    isHost: v.boolean(),
  })
    .index("by_room_device", ["roomId", "deviceId"])
    .index("by_seat", ["seatId"]),

  answers: defineTable({
    roomId: v.id("rooms"),
    roundIndex: v.number(),
    seatId: v.id("seats"),
    text: v.string(),
  }).index("by_room_round", ["roomId", "roundIndex"]),

  messages: defineTable({
    roomId: v.id("rooms"),
    seatId: v.id("seats"),
    text: v.string(),
  }).index("by_room", ["roomId"]),

  votes: defineTable({
    roomId: v.id("rooms"),
    voterSeatId: v.id("seats"),
    targetSeatId: v.id("seats"),
  })
    .index("by_room", ["roomId"])
    .index("by_room_voter", ["roomId", "voterSeatId"]),
});
