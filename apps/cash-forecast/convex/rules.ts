import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertAmount, assertDateString, assertDayOfMonth, assertName } from "./validate";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const rules = await ctx.db
      .query("rules")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    return rules.sort((a, b) => {
      if (a.dayOfMonth !== b.dayOfMonth) return a.dayOfMonth - b.dayOfMonth;
      return a.name.localeCompare(b.name, "ja");
    });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    kind: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    dayOfMonth: v.number(),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { name, kind, amount, dayOfMonth, endDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    const trimmedName = assertName(name);
    assertAmount(amount);
    assertDayOfMonth(dayOfMonth);
    if (endDate !== undefined) {
      assertDateString(endDate, "終了日");
    }

    return ctx.db.insert("rules", {
      userId: identity.subject,
      name: trimmedName,
      kind,
      amount,
      dayOfMonth,
      endDate,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("rules"),
    name: v.string(),
    kind: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    dayOfMonth: v.number(),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, kind, amount, dayOfMonth, endDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("権限がありません");
    }
    const trimmedName = assertName(name);
    assertAmount(amount);
    assertDayOfMonth(dayOfMonth);
    if (endDate !== undefined) {
      assertDateString(endDate, "終了日");
    }

    // endDate を省略した場合は undefined を明示的に patch し、既存の終了日をクリアする
    await ctx.db.patch(id, {
      name: trimmedName,
      kind,
      amount,
      dayOfMonth,
      endDate,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("rules") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("権限がありません");
    }
    await ctx.db.delete(id);
  },
});
