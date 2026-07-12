import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertAmount, assertDateString, assertDayOfMonth, assertName } from "./validate";
import { isPro } from "./billing";

// Freeプランで作成できるルールの上限（アプリ固有の値のためbilling.tsではなくここに置く）。
// 既存データは消さない: 上限超過は新規作成のみブロックし、既存ルールの編集・削除は制限しない。
export const FREE_RULE_LIMIT = 3;

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

    if (!(await isPro(ctx, identity.subject))) {
      const count = (
        await ctx.db
          .query("rules")
          .withIndex("by_user", (q) => q.eq("userId", identity.subject))
          .collect()
      ).length;
      if (count >= FREE_RULE_LIMIT) {
        throw new ConvexError(
          `Freeプランで作成できるルールは${FREE_RULE_LIMIT}件までです。Proプランなら無制限です`,
        );
      }
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

    // このルールを参照する取引を月ごとに分類する。
    // 上書き行（addonでない）がある月のアドオンは内訳履歴として残し、
    // 上書きが無い月（未確定）のアドオンはルールと一緒に削除する。
    const relatedRows = await ctx.db
      .query("transactions")
      .withIndex("by_user_rule", (q) => q.eq("userId", identity.subject).eq("ruleId", id))
      .collect();

    const overriddenMonths = new Set(
      relatedRows.filter((row) => row.addon !== true).map((row) => row.ruleMonth),
    );
    for (const row of relatedRows) {
      if (row.addon === true && !overriddenMonths.has(row.ruleMonth)) {
        await ctx.db.delete(row._id);
      }
    }

    await ctx.db.delete(id);
  },
});
