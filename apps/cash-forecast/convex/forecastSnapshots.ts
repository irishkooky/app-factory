import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query, type MutationCtx } from "./_generated/server";
import { isPro } from "./billing";
import { assertDateString } from "./validate";
import { todayJST } from "../src/lib/date";
import { buildForecast } from "../src/lib/forecast";
import { currentPosition } from "../src/lib/forecastList";
import { isQuarterEnd, QUARTERS_AHEAD, shiftQuarterEnd } from "../src/lib/forecastSnapshot";

/**
 * takenOn（四半期末）時点の残高と、1〜4四半期先の予測残高を1件記録する。
 * 計算はメイン画面と同じ（buildForecast + currentPosition）。同じ日の記録が既にあれば何もしない。
 */
async function recordForUser(ctx: MutationCtx, userId: string, takenOn: string): Promise<boolean> {
  const existing = await ctx.db
    .query("forecastSnapshots")
    .withIndex("by_user_taken", (q) => q.eq("userId", userId).eq("takenOn", takenOn))
    .unique();
  if (existing !== null) return false;

  const settings = await ctx.db
    .query("settings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (settings === null) return false;

  const rules = await ctx.db
    .query("rules")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const allTxs = await ctx.db
    .query("transactions")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();

  const rows = buildForecast({
    anchorDate: settings.anchorDate,
    anchorBalance: settings.anchorBalance,
    threshold: settings.threshold,
    rules,
    transactions: allTxs.filter((tx) => tx.date > settings.anchorDate),
    historyTransactions: allTxs.filter((tx) => tx.date <= settings.anchorDate),
    horizonEnd: shiftQuarterEnd(takenOn, QUARTERS_AHEAD[QUARTERS_AHEAD.length - 1]),
  });
  const balanceAt = (date: string) =>
    currentPosition({
      rows,
      today: date,
      anchorDate: settings.anchorDate,
      anchorBalance: settings.anchorBalance,
    }).balance;

  await ctx.db.insert("forecastSnapshots", {
    userId,
    takenOn,
    balance: balanceAt(takenOn),
    predictions: QUARTERS_AHEAD.map((n) => {
      const date = shiftQuarterEnd(takenOn, n);
      return { date, balance: balanceAt(date) };
    }),
  });
  return true;
}

/** 閲覧は Pro だけ。記録自体はプランに関係なく続いているので、Pro にすると過去分もすぐ見える。 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    if (!(await isPro(ctx, identity.subject))) return [];

    const rows = await ctx.db
      .query("forecastSnapshots")
      .withIndex("by_user_taken", (q) => q.eq("userId", identity.subject))
      .collect();
    return rows.map(({ takenOn, balance, predictions }) => ({ takenOn, balance, predictions }));
  },
});

/** 1ユーザー分の記録。cron から日付を固定して呼ぶ。運用時は npx convex run でも呼べる。 */
export const recordForUserInternal = internalMutation({
  args: { userId: v.string(), takenOn: v.string() },
  handler: async (ctx, { userId, takenOn }) => {
    assertDateString(takenOn, "記録日");
    if (!isQuarterEnd(takenOn)) {
      throw new ConvexError("記録日は四半期末（3/31・6/30・9/30・12/31）を指定してください");
    }
    // 先の日付を今の数字で埋めると、その日の本来の記録が重複扱いで弾かれる
    if (takenOn > todayJST()) {
      throw new ConvexError("まだ来ていない日付は記録できません");
    }
    return { recorded: await recordForUser(ctx, userId, takenOn) };
  },
});

/** cron から毎日呼ぶ。JST の今日が四半期末の日だけ、初期設定済みの全ユーザー（Free を含む）を記録する。 */
export const recordQuarterEnd = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = todayJST();
    if (!isQuarterEnd(today)) return { today, scheduled: 0 };

    const settings = await ctx.db.query("settings").collect();
    for (const row of settings) {
      await ctx.scheduler.runAfter(0, internal.forecastSnapshots.recordForUserInternal, {
        userId: row.userId,
        takenOn: today,
      });
    }
    return { today, scheduled: settings.length };
  },
});
