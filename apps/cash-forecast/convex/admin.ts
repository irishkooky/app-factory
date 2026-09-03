import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * 運用用: from ユーザーの settings / rules / transactions の所有者を to ユーザーに付け替える。
 * subscriptions（Stripe連携）は触らない。
 * 実行例: npx convex run admin:moveUserData '{"from":"user_xxx","to":"user_yyy","dryRun":true}'
 */
export const moveUserData = internalMutation({
  args: { from: v.string(), to: v.string(), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { from, to, dryRun }) => {
    if (!from || !to || from === to) {
      throw new ConvexError("from と to は異なる空でないユーザーIDを指定してください");
    }

    const fromSettings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", from))
      .unique();
    const fromRules = await ctx.db
      .query("rules")
      .withIndex("by_user", (q) => q.eq("userId", from))
      .collect();
    const fromTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", from))
      .collect();

    const toRules = await ctx.db
      .query("rules")
      .withIndex("by_user", (q) => q.eq("userId", to))
      .collect();
    const toTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", to))
      .collect();

    if (toRules.length > 0 || toTransactions.length > 0) {
      throw new ConvexError(
        `to ユーザーには既にデータが存在するため中断しました（rules: ${toRules.length}件, transactions: ${toTransactions.length}件）`,
      );
    }

    const toSettings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", to))
      .unique();

    const result = {
      dryRun: !!dryRun,
      settings: fromSettings ? 1 : 0,
      rules: fromRules.length,
      transactions: fromTransactions.length,
      replacedToSettings: !!toSettings,
    };

    if (dryRun) {
      return result;
    }

    if (toSettings) {
      await ctx.db.delete(toSettings._id);
    }
    if (fromSettings) {
      await ctx.db.patch(fromSettings._id, { userId: to });
    }
    for (const rule of fromRules) {
      await ctx.db.patch(rule._id, { userId: to });
    }
    for (const tx of fromTransactions) {
      await ctx.db.patch(tx._id, { userId: to });
    }

    return result;
  },
});
