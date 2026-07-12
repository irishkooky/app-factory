import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  settings: defineTable({
    userId: v.string(),
    anchorDate: v.string(), // "YYYY-MM-DD"（この日の終了時点の残高、という意味論）
    anchorBalance: v.number(), // 整数円
    threshold: v.number(), // 警告しきい値。初期値 100000
  }).index("by_user", ["userId"]),

  rules: defineTable({
    userId: v.string(),
    name: v.string(),
    kind: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(), // 整数円 >= 0
    dayOfMonth: v.number(), // 1..31。月の日数を超える場合は末日にクランプ
    endDate: v.optional(v.string()), // "YYYY-MM-DD"。この日より後の発生は生成しない
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    userId: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    name: v.string(),
    kind: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(), // 整数円 >= 0
    ruleId: v.optional(v.id("rules")), // ルール確定（上書き）の場合のみ
    ruleMonth: v.optional(v.string()), // "YYYY-MM"。どの月の仮想行を置き換えるか
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_rule", ["userId", "ruleId", "ruleMonth"]),
});
