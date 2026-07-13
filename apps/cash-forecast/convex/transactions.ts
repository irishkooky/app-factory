import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertAmount, assertDateString, assertMonthString, assertName } from "./validate";
import { requirePro } from "./billing";

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

// 認証ユーザーの settings.anchorDate 以下の date を持つ全 transactions を返す（履歴表示用）。
// actual フラグでは絞らない。実績導入前に作られた行（旧・確定行など）も履歴として見せるため。
export const listHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!settings) {
      return [];
    }
    return ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", identity.subject).lte("date", settings.anchorDate))
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
    addon: v.optional(v.boolean()),
  },
  handler: async (ctx, { date, name, kind, amount, ruleId, ruleMonth, addon }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    if (addon === true) {
      // アドオン（ルール月への上乗せ）の新規作成はProプラン限定。
      // 既存アドオンの編集・削除（update/remove）や、ルール確定・手入力の作成は制限しない。
      await requirePro(ctx, identity.subject);
    }
    if ((ruleId === undefined) !== (ruleMonth === undefined)) {
      throw new Error("ruleIdとruleMonthは両方指定するか、両方省略してください");
    }
    if (addon === true && (ruleId === undefined || ruleMonth === undefined)) {
      throw new Error("上乗せにはruleIdとruleMonthが必要です");
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
      // 【重要】同一 (userId, ruleId, ruleMonth) にはアドオン導入後、上書き行(最大1件)と
      // アドオン行(複数件)が並び得るため .unique() は使えない。.collect() してフィルタする。
      const existingRows = await ctx.db
        .query("transactions")
        .withIndex("by_user_rule", (q) =>
          q.eq("userId", identity.subject).eq("ruleId", ruleId).eq("ruleMonth", ruleMonth),
        )
        .collect();
      const hasOverride = existingRows.some((row) => row.addon !== true);
      if (hasOverride) {
        // 上書き作成時: 既存の上書きがあれば重複確定を防ぐ。
        // アドオン作成時: 上書き済みの月には上乗せを追加させない（確定額を直接編集させる）。
        throw new Error(
          addon === true
            ? "この月は確定済みです。確定した金額を直接編集してください"
            : "この月は確定済みです",
        );
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
      addon,
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
    // 判定は actual フラグではなく「行の現在位置」で行う。
    // 実績導入前に作られ actual===undefined のまま基準日以前に取り残された旧行（レガシー行）も
    // 履歴として編集できる必要があるため。
    const isHistoryRow = existing.actual === true || existing.date <= settings.anchorDate;
    if (isHistoryRow) {
      // 履歴行（実績・レガシー問わず）は過去の記録なので、基準日より未来の日付には変更できない（逆向きガード）。
      if (date > settings.anchorDate) {
        throw new Error("実績は基準日以前の日付にしてください");
      }
    } else if (date <= settings.anchorDate) {
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
