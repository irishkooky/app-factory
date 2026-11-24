/**
 * E2E 専用: reparent UX 実画面スクショ用フィクスチャ。
 */
import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { addDays, addMonths, addMonthsToDateClamped, monthOf, todayJST } from "../src/lib/date";

export const seed = internalMutation({
  args: { clerkUserId: v.string(), label: v.optional(v.string()) },
  handler: async (ctx, { clerkUserId, label }) => {
    if (!clerkUserId.startsWith("user_")) {
      throw new ConvexError("clerkUserId が不正です");
    }

    const tag = label ?? `reparent-ux-${Date.now()}`;
    const today = todayJST();
    const anchorDate = addDays(today, -45);
    const sourceDate = addDays(today, 10);
    const targetRuleMonth = addMonths(monthOf(sourceDate), 7);
    const moveTargetRuleMonth = addMonths(targetRuleMonth, 1);

    const anchorBalance = 800_000;
    const threshold = 100_000;

    const existingSettings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", clerkUserId))
      .unique();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, { anchorDate, anchorBalance, threshold });
    } else {
      await ctx.db.insert("settings", {
        userId: clerkUserId,
        anchorDate,
        anchorBalance,
        threshold,
      });
    }

    for (const tx of await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", clerkUserId))
      .collect()) {
      await ctx.db.delete(tx._id);
    }
    for (const rule of await ctx.db
      .query("rules")
      .withIndex("by_user", (q) => q.eq("userId", clerkUserId))
      .collect()) {
      await ctx.db.delete(rule._id);
    }

    const rules = [
      { name: "AMEX", amount: 130_000, dayOfMonth: 12 },
      { name: "iDeCo", amount: 23_000, dayOfMonth: 27 },
      { name: "楽天カード", amount: 45_000, dayOfMonth: 10 },
      { name: "家賃", amount: 130_000, dayOfMonth: 25 },
    ] as const;

    const ruleIds: string[] = [];
    for (const r of rules) {
      const id = await ctx.db.insert("rules", {
        userId: clerkUserId,
        name: r.name,
        kind: "expense",
        amount: r.amount,
        dayOfMonth: r.dayOfMonth,
      });
      ruleIds.push(id);
    }

    const sourceId = await ctx.db.insert("transactions", {
      userId: clerkUserId,
      date: sourceDate,
      name: `E2E移動元 ${tag}`,
      kind: "expense",
      amount: 54_000,
      amountBreakdown: [
        { amount: 50_000, label: "本体" },
        { amount: 4_000, label: "繰越分" },
      ],
    });

    const horizonEnd = addMonthsToDateClamped(today, 12);
    const fillerNames = ["食料品", "外食", "光熱費"];
    let fillerIdx = 0;
    let cursor = addDays(anchorDate, 1);
    while (cursor <= horizonEnd) {
      if (cursor > anchorDate) {
        await ctx.db.insert("transactions", {
          userId: clerkUserId,
          date: cursor,
          name: fillerNames[fillerIdx % fillerNames.length]!,
          kind: "expense",
          amount: 8_000 + fillerIdx * 500,
        });
        fillerIdx++;
      }
      cursor = addDays(cursor, 28);
    }

    return {
      ok: true,
      tag,
      sourceId,
      sourceDate,
      targetRuleMonth,
      moveTargetRuleMonth,
      rentRuleName: "家賃",
      anchorDate,
      today,
    };
  },
});