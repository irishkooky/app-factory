// このファイルはアプリ非依存。新規アプリにはこのままコピーする（docs/billing.md 参照）。
//
// Stripe Webhook（POST /stripe/webhook）。
//
// 堅牢性の要点:
// - 署名検証必須（stripe-signatureヘッダ + STRIPE_WEBHOOK_SECRET）
// - 同一イベントの再送に冪等: ペイロードの値は使わず、イベントからsubscription IDだけ
//   取り出し、Stripe APIから「今の」subscription状態を取得してupsertする。
//   これにより、イベントの重複配送や順序の入れ替わり（例: updated が deleted より後に届く）
//   があっても、常に最新のStripe側状態へ収束する。

import { httpRouter } from "convex/server";
import Stripe from "stripe";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Convexのサーバーランタイムはprocess.envで環境変数を公開する（Node.js全体の型は入れず最小限の宣言のみ）。
declare const process: { env: Record<string, string | undefined> };

const RELEVANT_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function stripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
}

function toId(value: string | { id: string } | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === "string" ? value : value.id;
}

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secretKey || !webhookSecret) {
      console.error("stripe webhook: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET が未設定です");
      return new Response("Webhook is not configured", { status: 500 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const body = await request.text();
    const stripe = stripeClient(secretKey);

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
    } catch (err) {
      console.error("stripe webhook: signature verification failed", err);
      return new Response("Invalid signature", { status: 400 });
    }

    try {
      if (!RELEVANT_EVENT_TYPES.has(event.type)) {
        return new Response(null, { status: 200 });
      }

      let subscriptionId: string | undefined;
      let userIdHint: string | undefined;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) {
          return new Response(null, { status: 200 });
        }
        subscriptionId = toId(session.subscription);
        userIdHint =
          session.client_reference_id ??
          (typeof session.metadata?.userId === "string" ? session.metadata.userId : undefined) ??
          undefined;
      } else {
        // customer.subscription.updated / customer.subscription.deleted
        const subscription = event.data.object as Stripe.Subscription;
        subscriptionId = subscription.id;
      }

      if (!subscriptionId) {
        return new Response(null, { status: 200 });
      }

      // ペイロードの値は使わず、常に「今の」状態をStripeへ取りに行く（順序耐性・冪等性のため）。
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const userId =
        userIdHint ??
        (typeof subscription.metadata?.userId === "string"
          ? subscription.metadata.userId
          : undefined);
      const customerId = toId(subscription.customer);
      if (!customerId) {
        console.error(`stripe webhook: subscription ${subscription.id} に customer がありません`);
        return new Response(null, { status: 200 });
      }
      const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? 0;

      await ctx.runMutation(internal.billing.upsertFromStripe, {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: currentPeriodEnd * 1000,
      });

      return new Response(null, { status: 200 });
    } catch (err) {
      // 予期しない例外は500で返し、Stripe側の再送に任せる。
      console.error("stripe webhook: unexpected error", err);
      return new Response("Internal error", { status: 500 });
    }
  }),
});

export default http;
