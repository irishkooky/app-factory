import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertAmount, assertDateString, assertMonthString, assertName, assertOptionalName } from "./validate";
import { requirePro } from "./billing";
import { addMonthsToDateClamped, clampedDateInMonth, todayJST } from "../src/lib/date";
import { computeReparent } from "../src/lib/reparentBreakdown";
import {
  computeReparentToRuleAddon,
  computeUndoReparentToRuleAddon,
} from "../src/lib/reparentToRuleAddon";
import {
  addonLabelMatches,
  computeReparentAddonToRuleMonth,
  computeReparentAddonToTransaction,
} from "../src/lib/reparentAddon";

const amountBreakdownArg = v.optional(
  v.array(
    v.object({
      amount: v.number(),
      label: v.optional(v.string()),
    }),
  ),
);

type AmountBreakdownEntry = { amount: number; label?: string };

/** Validate each line; when non-empty, require rounded sum === amount. */
function assertAmountBreakdown(
  amount: number,
  amountBreakdown: AmountBreakdownEntry[] | undefined,
): AmountBreakdownEntry[] | undefined {
  if (amountBreakdown === undefined || amountBreakdown.length === 0) {
    return amountBreakdown;
  }
  let sum = 0;
  for (const entry of amountBreakdown) {
    assertAmount(entry.amount);
    sum += entry.amount;
  }
  if (Math.round(sum) !== amount) {
    throw new ConvexError("金額の内訳の合計が金額と一致しません");
  }
  return amountBreakdown;
}

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
    amountBreakdown: amountBreakdownArg,
    ruleId: v.optional(v.id("rules")),
    ruleMonth: v.optional(v.string()),
    addon: v.optional(v.boolean()),
  },
  handler: async (ctx, { date, name, kind, amount, amountBreakdown, ruleId, ruleMonth, addon }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    if (addon === true) {
      // アドオン（ルール月への上乗せ）の新規作成はProプラン限定。
      // 既存アドオンの編集・削除（update/remove）や、ルール確定・手入力の作成は制限しない。
      await requirePro(ctx, identity.subject);
    }
    if ((ruleId === undefined) !== (ruleMonth === undefined)) {
      throw new ConvexError("ruleIdとruleMonthは両方指定するか、両方省略してください");
    }
    if (addon === true && (ruleId === undefined || ruleMonth === undefined)) {
      throw new ConvexError("上乗せにはruleIdとruleMonthが必要です");
    }

    const trimmedName = addon === true ? assertOptionalName(name) : assertName(name);
    assertAmount(amount);
    const breakdown = assertAmountBreakdown(amount, amountBreakdown);
    assertDateString(date, "日付");
    if (ruleMonth !== undefined) {
      assertMonthString(ruleMonth);
    }

    if (ruleId !== undefined && ruleMonth !== undefined) {
      const rule = await ctx.db.get(ruleId);
      if (!rule || rule.userId !== identity.subject) {
        throw new ConvexError("権限がありません");
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
        throw new ConvexError(
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
      throw new ConvexError("先に残高の初期設定を行ってください");
    }
    if (date <= settings.anchorDate) {
      throw new ConvexError(`基準日(${settings.anchorDate})以前の日付には追加できません`);
    }

    return ctx.db.insert("transactions", {
      userId: identity.subject,
      date,
      name: trimmedName,
      kind,
      amount,
      ...(breakdown !== undefined && breakdown.length > 0 ? { amountBreakdown: breakdown } : {}),
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
    amountBreakdown: amountBreakdownArg,
  },
  handler: async (ctx, { id, date, name, kind, amount, amountBreakdown }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }

    const trimmedName = existing.addon === true ? assertOptionalName(name) : assertName(name);
    assertAmount(amount);
    const breakdown = assertAmountBreakdown(amount, amountBreakdown);
    assertDateString(date, "日付");

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!settings) {
      throw new ConvexError("先に残高の初期設定を行ってください");
    }
    // 判定は actual フラグではなく「行の現在位置」で行う。
    // 実績導入前に作られ actual===undefined のまま基準日以前に取り残された旧行（レガシー行）も
    // 履歴として編集できる必要があるため。
    const isHistoryRow = existing.actual === true || existing.date <= settings.anchorDate;
    if (isHistoryRow) {
      // 履歴行（実績・レガシー問わず）は過去の記録なので、基準日より未来の日付には変更できない（逆向きガード）。
      if (date > settings.anchorDate) {
        throw new ConvexError("実績は基準日以前の日付にしてください");
      }
    } else if (date <= settings.anchorDate) {
      throw new ConvexError(`基準日(${settings.anchorDate})以前の日付には追加できません`);
    }

    // amountBreakdown omitted → leave existing field (AddonForm など内訳を触らない更新)。
    // [] を渡したときだけクリア。Convex の patch は undefined を無視する。
    await ctx.db.patch(id, {
      date,
      name: trimmedName,
      kind,
      amount,
      ...(amountBreakdown !== undefined
        ? { amountBreakdown: breakdown !== undefined && breakdown.length > 0 ? breakdown : [] }
        : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }
    await ctx.db.delete(id);
  },
});

/**
 * 内訳1行を別取引へ原子的に移動する。
 * スキーマ変更なし。制約違反は ConvexError。成功時は Undo 用の逆 patch 情報を返す。
 */
export const reparentBreakdownLine = mutation({
  args: {
    sourceId: v.id("transactions"),
    targetId: v.id("transactions"),
    index: v.number(),
    expectedAmount: v.number(),
    expectedLabel: v.optional(v.string()),
  },
  handler: async (ctx, { sourceId, targetId, index, expectedAmount, expectedLabel }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }

    const source = await ctx.db.get(sourceId);
    const target = await ctx.db.get(targetId);
    if (!source || source.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }
    if (!target || target.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!settings) {
      throw new ConvexError("先に残高の初期設定を行ってください");
    }

    assertAmount(expectedAmount);
    if (!Number.isInteger(index) || index < 0) {
      throw new ConvexError("内訳の行が見つかりません");
    }

    const horizonEnd = addMonthsToDateClamped(todayJST(), 12);
    const result = computeReparent({
      source: {
        id: source._id,
        kind: source.kind,
        amount: source.amount,
        amountBreakdown: source.amountBreakdown,
        date: source.date,
        addon: source.addon,
        actual: source.actual,
        importBatchId: source.importBatchId,
      },
      target: {
        id: target._id,
        kind: target.kind,
        amount: target.amount,
        amountBreakdown: target.amountBreakdown,
        date: target.date,
        addon: target.addon,
        actual: target.actual,
        importBatchId: target.importBatchId,
      },
      index,
      expectedAmount,
      expectedLabel,
      anchorDate: settings.anchorDate,
      horizonEnd,
    });

    if ("error" in result) {
      throw new ConvexError(result.error);
    }

    // 両親とも amount === 内訳合計（正規化後）。空クリアは [] で明示。
    await ctx.db.patch(sourceId, {
      amount: result.source.amount,
      amountBreakdown:
        result.source.amountBreakdown !== undefined && result.source.amountBreakdown.length > 0
          ? result.source.amountBreakdown
          : [],
    });
    await ctx.db.patch(targetId, {
      amount: result.target.amount,
      amountBreakdown:
        result.target.amountBreakdown !== undefined && result.target.amountBreakdown.length > 0
          ? result.target.amountBreakdown
          : [],
    });

    return {
      sourceId,
      targetId,
      sourceAmount: result.source.amount,
      targetAmount: result.target.amount,
      dateChanged: result.dateChanged,
      sourceDate: source.date,
      targetDate: target.date,
      undo: {
        sourceId: targetId,
        targetId: sourceId,
        index: result.undo.index,
        expectedAmount: result.undo.expectedAmount,
        expectedLabel: result.undo.expectedLabel,
      },
    };
  },
});

/**
 * 内訳1行を未確定ルール月へ addon として原子的に移動する。
 */
export const reparentBreakdownLineToRuleAddon = mutation({
  args: {
    sourceId: v.id("transactions"),
    ruleId: v.id("rules"),
    ruleMonth: v.string(),
    expectedRuleDate: v.string(),
    index: v.number(),
    expectedAmount: v.number(),
    expectedLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    await requirePro(ctx, identity.subject);

    const { sourceId, ruleId, ruleMonth, expectedRuleDate, index, expectedAmount, expectedLabel } =
      args;

    const source = await ctx.db.get(sourceId);
    if (!source || source.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }

    const rule = await ctx.db.get(ruleId);
    if (!rule || rule.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }

    assertAmount(expectedAmount);
    if (!Number.isInteger(index) || index < 0) {
      throw new ConvexError("内訳の行が見つかりません");
    }
    assertMonthString(ruleMonth);
    assertDateString(expectedRuleDate, "日付");

    const ruleDate = clampedDateInMonth(ruleMonth, rule.dayOfMonth);
    if (ruleDate !== expectedRuleDate) {
      throw new ConvexError("移動先のルール月が変わっています。画面を開き直してください");
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!settings) {
      throw new ConvexError("先に残高の初期設定を行ってください");
    }

    const existingRows = await ctx.db
      .query("transactions")
      .withIndex("by_user_rule", (q) =>
        q.eq("userId", identity.subject).eq("ruleId", ruleId).eq("ruleMonth", ruleMonth),
      )
      .collect();
    const targetMonthHasOverride = existingRows.some((row) => row.addon !== true);

    const horizonEnd = addMonthsToDateClamped(todayJST(), 12);
    const result = computeReparentToRuleAddon({
      source: {
        id: source._id,
        kind: source.kind,
        amount: source.amount,
        amountBreakdown: source.amountBreakdown,
        date: source.date,
        addon: source.addon,
        actual: source.actual,
        importBatchId: source.importBatchId,
      },
      target: { ruleId: rule._id, ruleMonth, date: ruleDate },
      index,
      expectedAmount,
      expectedLabel,
      anchorDate: settings.anchorDate,
      horizonEnd,
      targetMonthHasOverride,
    });

    if ("error" in result) {
      throw new ConvexError(result.error);
    }

    await ctx.db.patch(sourceId, {
      amount: result.source.amount,
      amountBreakdown:
        result.source.amountBreakdown !== undefined && result.source.amountBreakdown.length > 0
          ? result.source.amountBreakdown
          : [],
    });

    const addonId = await ctx.db.insert("transactions", {
      userId: identity.subject,
      date: result.addon.date,
      name: assertOptionalName(result.addon.name),
      kind: result.addon.kind,
      amount: result.addon.amount,
      ruleId: ruleId,
      ruleMonth,
      addon: true,
      reparentOriginSourceId: sourceId,
      reparentOriginSourceIndex: result.undo.sourceIndex,
    });

    return {
      sourceId,
      addonId,
      dateChanged: result.dateChanged,
      sourceDate: source.date,
      targetDate: ruleDate,
      undo: {
        sourceId,
        addonId,
        sourceIndex: result.undo.sourceIndex,
        expectedAmount: result.undo.expectedAmount,
        expectedLabel: result.undo.expectedLabel,
      },
    };
  },
});

/** reparentBreakdownLineToRuleAddon の Undo（addon 削除 + 内訳行を戻す） */
export const undoReparentBreakdownLineToRuleAddon = mutation({
  args: {
    sourceId: v.id("transactions"),
    addonId: v.id("transactions"),
    sourceIndex: v.number(),
    expectedAmount: v.number(),
    expectedLabel: v.optional(v.string()),
  },
  handler: async (ctx, { sourceId, addonId, sourceIndex, expectedAmount, expectedLabel }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }

    const source = await ctx.db.get(sourceId);
    const addon = await ctx.db.get(addonId);
    if (!source || source.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }
    if (!addon || addon.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }
    if (addon.addon !== true) {
      throw new ConvexError("取り消し対象が見つかりません");
    }
    if (addon.amount !== expectedAmount) {
      throw new ConvexError("移動した内容が変わっています。画面を開き直してください");
    }
    const addonLabel = addon.name?.trim() ?? "";
    const expected = expectedLabel?.trim() ?? "";
    if (expected.length > 0) {
      if (addonLabel !== expected) {
        throw new ConvexError("移動した内容が変わっています。画面を開き直してください");
      }
    }

    const line =
      expectedLabel !== undefined && expectedLabel !== ""
        ? { amount: expectedAmount, label: expectedLabel }
        : { amount: expectedAmount };

    const restored = computeUndoReparentToRuleAddon({
      source: {
        id: source._id,
        kind: source.kind,
        amount: source.amount,
        amountBreakdown: source.amountBreakdown,
        date: source.date,
        addon: source.addon,
        actual: source.actual,
        importBatchId: source.importBatchId,
      },
      index: sourceIndex,
      line,
    });

    await ctx.db.delete(addonId);
    await ctx.db.patch(sourceId, {
      amount: restored.amount,
      amountBreakdown:
        restored.amountBreakdown !== undefined && restored.amountBreakdown.length > 0
          ? restored.amountBreakdown
          : [],
    });
  },
});

/** addon 行を別の実取引の内訳へ移動（addon 削除 + ターゲットに行追加） */
export const reparentAddonToTransaction = mutation({
  args: {
    addonId: v.id("transactions"),
    targetId: v.id("transactions"),
    expectedAmount: v.number(),
    expectedLabel: v.optional(v.string()),
  },
  handler: async (ctx, { addonId, targetId, expectedAmount, expectedLabel }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    await requirePro(ctx, identity.subject);

    const addon = await ctx.db.get(addonId);
    const target = await ctx.db.get(targetId);
    if (!addon || addon.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }
    if (!target || target.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }
    if (!addonLabelMatches(addon.name, expectedLabel)) {
      throw new ConvexError("移動した内容が変わっています。画面を開き直してください");
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!settings) {
      throw new ConvexError("先に残高の初期設定を行ってください");
    }

    const horizonEnd = addMonthsToDateClamped(todayJST(), 12);
    const result = computeReparentAddonToTransaction({
      addon: {
        id: addon._id,
        kind: addon.kind,
        amount: addon.amount,
        amountBreakdown: addon.amountBreakdown,
        date: addon.date,
        addon: addon.addon,
        actual: addon.actual,
        importBatchId: addon.importBatchId,
      },
      target: {
        id: target._id,
        kind: target.kind,
        amount: target.amount,
        amountBreakdown: target.amountBreakdown,
        date: target.date,
        addon: target.addon,
        actual: target.actual,
        importBatchId: target.importBatchId,
      },
      expectedAmount,
      expectedLabel,
      anchorDate: settings.anchorDate,
      horizonEnd,
    });

    if ("error" in result) {
      throw new ConvexError(result.error);
    }

    await ctx.db.delete(addonId);
    await ctx.db.patch(targetId, {
      amount: result.target.amount,
      amountBreakdown:
        result.target.amountBreakdown !== undefined && result.target.amountBreakdown.length > 0
          ? result.target.amountBreakdown
          : [],
    });

    return { dateChanged: result.dateChanged };
  },
});

/** addon 行を別の未確定ルール月へ移動 */
export const reparentAddonToRuleMonth = mutation({
  args: {
    addonId: v.id("transactions"),
    ruleId: v.id("rules"),
    ruleMonth: v.string(),
    expectedRuleDate: v.string(),
    expectedAmount: v.number(),
    expectedLabel: v.optional(v.string()),
  },
  handler: async (ctx, { addonId, ruleId, ruleMonth, expectedRuleDate, expectedAmount, expectedLabel }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    await requirePro(ctx, identity.subject);

    const addon = await ctx.db.get(addonId);
    if (!addon || addon.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }
    if (addon.ruleId === undefined || addon.ruleMonth === undefined) {
      throw new ConvexError("上乗せ行だけ移動できます");
    }
    if (!addonLabelMatches(addon.name, expectedLabel)) {
      throw new ConvexError("移動した内容が変わっています。画面を開き直してください");
    }

    const rule = await ctx.db.get(ruleId);
    if (!rule || rule.userId !== identity.subject) {
      throw new ConvexError("権限がありません");
    }

    assertAmount(expectedAmount);
    assertMonthString(ruleMonth);
    assertDateString(expectedRuleDate, "日付");

    const ruleDate = clampedDateInMonth(ruleMonth, rule.dayOfMonth);
    if (ruleDate !== expectedRuleDate) {
      throw new ConvexError("移動先のルール月が変わっています。画面を開き直してください");
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!settings) {
      throw new ConvexError("先に残高の初期設定を行ってください");
    }

    const existingRows = await ctx.db
      .query("transactions")
      .withIndex("by_user_rule", (q) =>
        q.eq("userId", identity.subject).eq("ruleId", ruleId).eq("ruleMonth", ruleMonth),
      )
      .collect();
    const targetMonthHasOverride = existingRows.some((row) => row.addon !== true);

    const horizonEnd = addMonthsToDateClamped(todayJST(), 12);
    const result = computeReparentAddonToRuleMonth({
      addon: {
        id: addon._id,
        kind: addon.kind,
        amount: addon.amount,
        amountBreakdown: addon.amountBreakdown,
        date: addon.date,
        addon: addon.addon,
        actual: addon.actual,
        importBatchId: addon.importBatchId,
        ruleId: String(addon.ruleId),
        ruleMonth: addon.ruleMonth,
      },
      target: { ruleId: String(ruleId), ruleMonth, date: ruleDate },
      expectedAmount,
      expectedLabel,
      anchorDate: settings.anchorDate,
      horizonEnd,
      targetMonthHasOverride,
    });

    if ("error" in result) {
      throw new ConvexError(result.error);
    }

    await ctx.db.patch(addonId, {
      ruleId,
      ruleMonth,
      date: result.patch.date,
    });

    return { dateChanged: result.dateChanged };
  },
});
