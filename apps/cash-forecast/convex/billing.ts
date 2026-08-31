// このファイルはアプリ非依存。新規アプリにはこのままコピーする（docs/billing.md 参照）。
//
// Stripeサブスク課金（Free/Pro）の中核ロジック。
// - プラン判定（getPlan/isPro/requirePro）
// - Checkout / Customer Portal セッションの発行
// - Webhookから受け取った最新状態のupsert
//
// アプリ固有の制限（例: Freeプランのルール件数上限）はこのファイルに書かず、
// 各アプリのモジュール（rules.ts等）側で isPro/requirePro を import して実装すること。

import Stripe from "stripe";
import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Convexのサーバーランタイムはprocess.envで環境変数を公開する（Node.js全体の型は入れず最小限の宣言のみ）。
// モジュールトップレベルでは読まず、必ず関数内で読むこと（Workers側の制約に合わせた慣習）。
declare const process: { env: Record<string, string | undefined> };

const ACTIVE_STATUSES = ["active", "trialing"];

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

/** userId のsubscriptionレコードを取得する（無ければnull）。他モジュールから直接dbを読める場所（query/mutationハンドラ内）で使う。 */
export async function getSubscription(
  ctx: QueryCtx,
  userId: string,
): Promise<Doc<"subscriptions"> | null> {
  return ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** userId が現在Proプラン相当か（active/trialing）を判定する。 */
export async function isPro(ctx: QueryCtx, userId: string): Promise<boolean> {
  const subscription = await getSubscription(ctx, userId);
  return subscription !== null && ACTIVE_STATUSES.includes(subscription.status);
}

/** Proでなければthrowする。作成系mutationの冒頭で使う想定。 */
export async function requirePro(ctx: QueryCtx, userId: string): Promise<void> {
  if (!(await isPro(ctx, userId))) {
    throw new ConvexError("Proプランへのアップグレードが必要です");
  }
}

// 現在ログイン中ユーザーのプランをクライアントへ返す公開query。UIはこの値の写しでしかない
// （真実のソースはサーバー側の判定=isPro/requirePro）。
export const getPlan = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const subscription = await getSubscription(ctx, identity.subject);
    const pro = subscription !== null && ACTIVE_STATUSES.includes(subscription.status);
    return {
      plan: pro ? ("pro" as const) : ("free" as const),
      status: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    };
  },
});

// action（Stripe呼び出し）から使うための内部query。
export const getForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return getSubscription(ctx, userId);
  },
});

// Checkout Session を作成し、そのURLを返す。
export const createCheckoutSession = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    const userId = identity.subject;

    const existing: Doc<"subscriptions"> | null = await ctx.runQuery(internal.billing.getForUser, {
      userId,
    });
    if (existing !== null && ACTIVE_STATUSES.includes(existing.status)) {
      throw new ConvexError("すでにProプランです");
    }

    const priceId = requireEnv("STRIPE_PRICE_ID");
    const appUrl = requireEnv("APP_URL");
    const stripe = stripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
      ...(existing !== null ? { customer: existing.stripeCustomerId } : {}),
      success_url: `${appUrl}/?billing=success`,
      cancel_url: `${appUrl}/?billing=cancel`,
    });

    if (!session.url) {
      throw new ConvexError("Stripe Checkout Sessionの作成に失敗しました（urlがありません）");
    }
    return session.url;
  },
});

// Customer Portal Session を作成し、そのURLを返す。
export const createPortalSession = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    const userId = identity.subject;

    const existing: Doc<"subscriptions"> | null = await ctx.runQuery(internal.billing.getForUser, {
      userId,
    });
    if (existing === null) {
      throw new ConvexError("サブスクリプションが見つかりません");
    }

    const appUrl = requireEnv("APP_URL");
    const portalConfigId = process.env.STRIPE_PORTAL_CONFIG_ID;
    const stripe = stripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: appUrl,
      ...(portalConfigId ? { configuration: portalConfigId } : {}),
    });

    return session.url;
  },
});

// Webhook（http.ts）から呼ばれる。Stripe側の最新状態をそのままミラーする。
// customerで既存レコードを探し、あればpatch（userIdは上書きしない）、
// 無ければuserIdが分かっている場合のみinsertする。
export const upsertFromStripe = internalMutation({
  args: {
    userId: v.optional(v.string()),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
  },
  handler: async (
    ctx,
    { userId, stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd },
  ) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_customer", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .unique();

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        stripeSubscriptionId,
        status,
        currentPeriodEnd,
      });
      return;
    }

    if (userId === undefined) {
      console.warn(
        `stripe webhook: userId不明のためsubscriptionを作成できません（customer=${stripeCustomerId}, subscription=${stripeSubscriptionId}）`,
      );
      return;
    }

    await ctx.db.insert("subscriptions", {
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      status,
      currentPeriodEnd,
    });
  },
});
