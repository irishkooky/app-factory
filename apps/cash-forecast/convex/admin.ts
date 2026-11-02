import Stripe from "stripe";
import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const ACTIVE_STATUSES = ["active", "trialing"];
/** E2E / 運用テスト用トライアル日数（支払い方法なし）。trialing は isPro 扱い。 */
const E2E_TRIAL_DAYS = 365;

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY が未設定です。scripts/stripe-provision.sh を実行してください",
    );
  }
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です。scripts/stripe-provision.sh を実行してください`);
  }
  return value;
}

/**
 * E2E / 検証用: Clerk userId に Stripe テストモードの trialing サブスクを付けて Pro にする。
 * 支払い方法なしの trial（trialing → isPro）。既存が active/trialing なら何もしない。
 * 実行例: npx convex run admin:ensureE2ePro '{"userId":"user_xxx","email":"…+clerk_test@…"}'
 */
type EnsureE2eProResult = {
  ok: true;
  alreadyPro: boolean;
  status: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd?: number;
};

export const ensureE2ePro = internalAction({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { userId, email }): Promise<EnsureE2eProResult> => {
    if (!userId) {
      throw new ConvexError("userId が空です");
    }

    const existing: {
      status: string;
      stripeCustomerId: string;
      stripeSubscriptionId: string;
    } | null = await ctx.runQuery(internal.billing.getForUser, { userId });
    if (existing !== null && ACTIVE_STATUSES.includes(existing.status)) {
      return {
        ok: true,
        alreadyPro: true,
        status: existing.status,
        stripeCustomerId: existing.stripeCustomerId,
        stripeSubscriptionId: existing.stripeSubscriptionId,
      };
    }

    const stripe = stripeClient();
    const priceId = requireEnv("STRIPE_PRICE_ID");

    let customerId: string | null = existing?.stripeCustomerId ?? null;
    if (customerId === null) {
      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        metadata: { userId, purpose: "e2e" },
      });
      customerId = customer.id;
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: E2E_TRIAL_DAYS,
      trial_settings: {
        end_behavior: { missing_payment_method: "pause" },
      },
      metadata: { userId, purpose: "e2e" },
    });

    const currentPeriodEnd =
      (subscription.items.data[0]?.current_period_end ?? subscription.trial_end ?? 0) * 1000;

    await ctx.runMutation(internal.billing.upsertFromStripe, {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd,
    });

    return {
      ok: true,
      alreadyPro: false,
      status: subscription.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd,
    };
  },
});

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
