import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { isPro, requirePro } from "./billing";
import { assertDateString } from "./validate";
import {
  dueDateForSlot,
  dueSlots,
  kindForSlot,
  MAX_IN_PROGRESS_SERIES,
  quarterStartOf,
  targetDateFromStart,
  type ObservationSlot,
} from "../src/lib/checkpoint";
import { buildForecast } from "../src/lib/forecast";
import { currentPosition } from "../src/lib/forecastList";
import { addMonthsToDateClamped, todayJST } from "../src/lib/date";

type Snapshot = {
  balanceToday: number;
  predictedBalanceAtTarget: number;
};

async function loadUserForecastInputs(ctx: MutationCtx, userId: string) {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (settings === null) return null;

  const rules = await ctx.db
    .query("rules")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const allTxs = await ctx.db
    .query("transactions")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();

  const historyTransactions = allTxs.filter((tx) => tx.date <= settings.anchorDate);
  const transactions = allTxs.filter((tx) => tx.date > settings.anchorDate);

  return { settings, rules, transactions, historyTransactions };
}

function snapshotBalances(
  inputs: {
    settings: Doc<"settings">;
    rules: Doc<"rules">[];
    transactions: Doc<"transactions">[];
    historyTransactions: Doc<"transactions">[];
  },
  today: string,
  targetDate: string,
): Snapshot {
  const horizonEnd =
    targetDate > addMonthsToDateClamped(today, 12) ? targetDate : addMonthsToDateClamped(today, 12);

  const rows = buildForecast({
    anchorDate: inputs.settings.anchorDate,
    anchorBalance: inputs.settings.anchorBalance,
    threshold: inputs.settings.threshold,
    rules: inputs.rules,
    transactions: inputs.transactions,
    historyTransactions: inputs.historyTransactions,
    horizonEnd,
  });

  const balanceToday = currentPosition({
    rows,
    today,
    anchorDate: inputs.settings.anchorDate,
    anchorBalance: inputs.settings.anchorBalance,
  }).balance;

  const predictedBalanceAtTarget = currentPosition({
    rows,
    today: targetDate,
    anchorDate: inputs.settings.anchorDate,
    anchorBalance: inputs.settings.anchorBalance,
  }).balance;

  return { balanceToday, predictedBalanceAtTarget };
}

async function countInProgress(ctx: MutationCtx, userId: string): Promise<number> {
  const rows = await ctx.db
    .query("forecastSeries")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "in_progress"))
    .collect();
  return rows.length;
}

async function findSeriesByStarted(
  ctx: MutationCtx,
  userId: string,
  startedAt: string,
): Promise<Doc<"forecastSeries"> | null> {
  return ctx.db
    .query("forecastSeries")
    .withIndex("by_user_started", (q) => q.eq("userId", userId).eq("startedAt", startedAt))
    .unique();
}

async function observationForSlot(
  ctx: MutationCtx,
  seriesId: Id<"forecastSeries">,
  slot: ObservationSlot,
): Promise<Doc<"forecastObservations"> | null> {
  return ctx.db
    .query("forecastObservations")
    .withIndex("by_series_slot", (q) => q.eq("seriesId", seriesId).eq("slot", slot))
    .unique();
}

async function recordDueObservations(
  ctx: MutationCtx,
  userId: string,
  series: Doc<"forecastSeries">,
  today: string,
  inputs: NonNullable<Awaited<ReturnType<typeof loadUserForecastInputs>>>,
): Promise<void> {
  if (series.status !== "in_progress") return;

  const slots = dueSlots(series.startedAt, series.targetDate, today);
  if (slots.length === 0) return;

  const snap = snapshotBalances(inputs, today, series.targetDate);

  for (const slot of slots) {
    const existing = await observationForSlot(ctx, series._id, slot);
    if (existing !== null) continue;

    const kind = kindForSlot(slot);
    const predicted =
      kind === "actual" ? snap.balanceToday : snap.predictedBalanceAtTarget;

    await ctx.db.insert("forecastObservations", {
      userId,
      seriesId: series._id,
      slot,
      dueDate: dueDateForSlot(series.startedAt, series.targetDate, slot),
      observedAt: today,
      predictedBalanceAtTarget: predicted,
      balanceToday: snap.balanceToday,
      kind,
    });

    if (kind === "actual") {
      await ctx.db.patch(series._id, { status: "reached" });
      series = { ...series, status: "reached" };
    }
  }
}

async function ensureForUser(ctx: MutationCtx, userId: string, today: string): Promise<void> {
  if (!(await isPro(ctx, userId))) return;

  const inputs = await loadUserForecastInputs(ctx, userId);
  if (inputs === null) return;

  const quarterStart = quarterStartOf(today);
  const existingQuarter = await findSeriesByStarted(ctx, userId, quarterStart);
  if (existingQuarter === null) {
    const inProgress = await countInProgress(ctx, userId);
    if (inProgress < MAX_IN_PROGRESS_SERIES) {
      const targetDate = targetDateFromStart(quarterStart);
      const seriesId = await ctx.db.insert("forecastSeries", {
        userId,
        startedAt: quarterStart,
        targetDate,
        status: "in_progress",
        source: "quarter",
      });
      const created = (await ctx.db.get(seriesId))!;
      await recordDueObservations(ctx, userId, created, today, inputs);
    }
  }

  const openSeries = await ctx.db
    .query("forecastSeries")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "in_progress"))
    .collect();

  for (const series of openSeries) {
    await recordDueObservations(ctx, userId, series, today, inputs);
  }
}

/** アプリ起動時の補完。Pro かつ設定済みなら四半期シリーズと未記録スロットを埋める。 */
export const ensure = mutation({
  args: { today: v.optional(v.string()) },
  handler: async (ctx, { today: todayArg }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { ok: false as const, reason: "unauthenticated" as const };

    const today = todayArg ?? todayJST();
    assertDateString(today, "今日");
    await ensureForUser(ctx, identity.subject, today);
    return { ok: true as const };
  },
});

/** 手動でシリーズを開始する（進行中が上限未満のとき）。 */
export const startManual = mutation({
  args: { today: v.optional(v.string()) },
  handler: async (ctx, { today: todayArg }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("ログインが必要です");
    await requirePro(ctx, identity.subject);

    const today = todayArg ?? todayJST();
    assertDateString(today, "今日");

    const inputs = await loadUserForecastInputs(ctx, identity.subject);
    if (inputs === null) {
      throw new ConvexError("先に残高の初期設定を行ってください");
    }

    const existing = await findSeriesByStarted(ctx, identity.subject, today);
    if (existing !== null) {
      throw new ConvexError("今日開始のシリーズが既にあります");
    }

    const inProgress = await countInProgress(ctx, identity.subject);
    if (inProgress >= MAX_IN_PROGRESS_SERIES) {
      throw new ConvexError(`進行中のチェックポイントは最大${MAX_IN_PROGRESS_SERIES}本までです`);
    }

    const targetDate = targetDateFromStart(today);
    const seriesId = await ctx.db.insert("forecastSeries", {
      userId: identity.subject,
      startedAt: today,
      targetDate,
      status: "in_progress",
      source: "manual",
    });
    const created = (await ctx.db.get(seriesId))!;
    await recordDueObservations(ctx, identity.subject, created, today, inputs);
    return seriesId;
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const seriesRows = await ctx.db
      .query("forecastSeries")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    seriesRows.sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0));

    const result = [];
    for (const series of seriesRows) {
      const observations = await ctx.db
        .query("forecastObservations")
        .withIndex("by_series", (q) => q.eq("seriesId", series._id))
        .collect();
      observations.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
      result.push({
        _id: series._id,
        startedAt: series.startedAt,
        targetDate: series.targetDate,
        status: series.status,
        source: series.source,
        observations: observations.map((o) => ({
          slot: o.slot,
          observedAt: o.observedAt,
          dueDate: o.dueDate,
          predictedBalanceAtTarget: o.predictedBalanceAtTarget,
          balanceToday: o.balanceToday,
          kind: o.kind,
        })),
      });
    }
    return result;
  },
});

export const ensureForUserInternal = internalMutation({
  args: { userId: v.string(), today: v.string() },
  handler: async (ctx, { userId, today }) => {
    assertDateString(today, "今日");
    await ensureForUser(ctx, userId, today);
  },
});

/** cron から呼ぶ。Pro ユーザーごとに ensure を走らせる。 */
export const runDaily = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = todayJST();
    const settings = await ctx.db.query("settings").collect();
    let users = 0;
    for (const row of settings) {
      if (!(await isPro(ctx, row.userId))) continue;
      await ensureForUser(ctx, row.userId, today);
      users += 1;
    }
    return { today, users };
  },
});
