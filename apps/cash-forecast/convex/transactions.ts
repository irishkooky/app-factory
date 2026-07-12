import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertAmount, assertDateString, assertMonthString, assertName } from "./validate";

export const listAfter = query({
  args: { after: v.string() },
  handler: async (ctx, { after }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", identity.subject).gt("date", after))
      .collect();
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    name: v.string(),
    kind: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    ruleId: v.optional(v.id("rules")),
    ruleMonth: v.optional(v.string()),
  },
  handler: async (ctx, { date, name, kind, amount, ruleId, ruleMonth }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    if ((ruleId === undefined) !== (ruleMonth === undefined)) {
      throw new Error("ruleIdとruleMonthは両方指定するか、両方省略してください");
    }

    const trimmedName = assertName(name);
    assertAmount(amount);
    assertDateString(date, "日付");
    if (ruleMonth !== undefined) {
      assertMonthString(ruleMonth);
    }

    if (ruleId !== undefined && ruleMonth !== undefined) {
      const rule = await ctx.db.get(ruleId);
      if (!rule || rule.userId !== identity.subject) {
        throw new Error("権限がありません");
      }
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_user_rule", (q) =>
          q.eq("userId", identity.subject).eq("ruleId", ruleId).eq("ruleMonth", ruleMonth),
        )
        .unique();
      if (existing) {
        throw new Error("この月は確定済みです");
      }
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!settings) {
      throw new Error("先に残高の初期設定を行ってください");
    }
    if (date <= settings.anchorDate) {
      throw new Error(`基準日(${settings.anchorDate})以前の日付には追加できません`);
    }

    return ctx.db.insert("transactions", {
      userId: identity.subject,
      date,
      name: trimmedName,
      kind,
      amount,
      ruleId,
      ruleMonth,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    date: v.string(),
    name: v.string(),
    kind: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
  },
  handler: async (ctx, { id, date, name, kind, amount }) => {
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
    assertDateString(date, "日付");

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!settings) {
      throw new Error("先に残高の初期設定を行ってください");
    }
    if (date <= settings.anchorDate) {
      throw new Error(`基準日(${settings.anchorDate})以前の日付には追加できません`);
    }

    await ctx.db.patch(id, { date, name: trimmedName, kind, amount });
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
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
