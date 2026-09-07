import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const pdfImportRow = v.object({
  installment: v.number(),
  sourceDate: v.string(),
  date: v.string(),
  name: v.string(),
  principal: v.number(),
  interest: v.number(),
  amount: v.number(),
  page: v.number(),
  acknowledgedDuplicate: v.optional(v.boolean()),
});

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
    closingDay: v.optional(v.number()), // 1..31。クレカの締め日。設定時は利用期間を表示に付与。月の日数を超える場合は末日にクランプ
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    userId: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    name: v.string(),
    kind: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(), // 整数円 >= 0
    ruleId: v.optional(v.id("rules")), // ルール確定（上書き）の場合のみ
    ruleMonth: v.optional(v.string()), // "YYYY-MM"。どの月の仮想行を置き換えるか
    addon: v.optional(v.boolean()), // true = ルール月への上乗せ。ruleId/ruleMonth とセットで使う
    actual: v.optional(v.boolean()), // true = 実績（基準日以前に実際に起きた入出金）
    batchId: v.optional(v.string()), // 実績化した照合（reconcile）操作のバッチID。Undo用
    importBatchId: v.optional(v.id("pdfImportBatches")),
    pdfSource: v.optional(
      v.object({
        loanKey: v.string(),
        sourceDate: v.string(),
        principal: v.number(),
        interest: v.number(),
        installment: v.number(),
        page: v.number(),
        originalDate: v.string(),
        originalName: v.string(),
        originalAmount: v.number(),
      }),
    ),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_rule", ["userId", "ruleId", "ruleMonth"])
    .index("by_import_batch", ["importBatchId"])
    .index("by_user_pdf_source", ["userId", "pdfSource.loanKey", "pdfSource.sourceDate"]),

  pdfImportBatches: defineTable({
    userId: v.string(),
    fileHash: v.string(),
    fileName: v.string(),
    loanKey: v.string(),
    createdAt: v.number(),
    count: v.number(),
    status: v.union(v.literal("active"), v.literal("cancelled")),
    rows: v.array(pdfImportRow),
  })
    .index("by_user", ["userId"])
    .index("by_user_hash_status", ["userId", "fileHash", "status"])
    .index("by_user_loan_status", ["userId", "loanKey", "status"]),

  // アプリ非依存（billing.ts参照）。Stripeサブスクの現在状態のミラー。
  subscriptions: defineTable({
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.string(), // Stripeのsubscription status（active/trialing/past_due/canceled/...）
    currentPeriodEnd: v.number(), // エポックミリ秒
  })
    .index("by_user", ["userId"])
    .index("by_customer", ["stripeCustomerId"]),
});
