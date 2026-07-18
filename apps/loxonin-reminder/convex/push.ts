"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { api, internal } from "./_generated/api";
import { internalAction, action } from "./_generated/server";

function formatDurationJa(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}時間${mins}分`;
  }
  if (hours > 0) {
    return `${hours}時間`;
  }
  return `${mins}分`;
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number") {
      return statusCode;
    }
  }
  return undefined;
}

export const sendReminder = internalAction({
  args: { doseId: v.id("doses") },
  handler: async (ctx, args) => {
    const dose = await ctx.runQuery(internal.doses.getDose, {
      doseId: args.doseId,
    });
    if (!dose || dose.notified) {
      return;
    }

    const subscription: string | null = await ctx.runQuery(
      internal.devices.getSubscription,
      { deviceId: dose.deviceId },
    );

    if (!subscription) {
      await ctx.runMutation(internal.doses.markNotified, {
        doseId: args.doseId,
      });
      return;
    }

    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT!,
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
      );

      const elapsedMinutes = Math.round((dose.notifyAt - dose.takenAt) / 60000);
      const elapsedLabel = formatDurationJa(elapsedMinutes);

      const payload = JSON.stringify({
        title: "💊 ロキソニンの時間",
        body: `前回の服用から${elapsedLabel}が経ちました。効果が切れる前に、次の服用を検討しましょう。`,
      });

      try {
        await webpush.sendNotification(JSON.parse(subscription), payload, {
          TTL: 3600,
          urgency: "high",
        });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        if (statusCode === 404 || statusCode === 410) {
          await ctx.runMutation(api.devices.removeSubscription, {
            deviceId: dose.deviceId,
          });
        } else {
          console.error("sendReminder: プッシュ通知の送信に失敗しました。", error);
        }
      }
    } finally {
      await ctx.runMutation(internal.doses.markNotified, {
        doseId: args.doseId,
      });
    }
  },
});

export const sendTest = action({
  args: { deviceId: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; reason?: string }> => {
    const subscription: string | null = await ctx.runQuery(
      internal.devices.getSubscription,
      { deviceId: args.deviceId },
    );

    if (!subscription) {
      return { ok: false, reason: "no-subscription" };
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    const payload = JSON.stringify({
      title: "💊 テスト通知",
      body: "通知の準備ができました。服用を記録すると、効果が切れる前にお知らせします。",
    });

    try {
      await webpush.sendNotification(JSON.parse(subscription), payload, {
        TTL: 3600,
        urgency: "high",
      });
      return { ok: true };
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      if (statusCode === 404 || statusCode === 410) {
        await ctx.runMutation(api.devices.removeSubscription, {
          deviceId: args.deviceId,
        });
        return { ok: false, reason: "expired" };
      }
      console.error("sendTest: プッシュ通知の送信に失敗しました。", error);
      return { ok: false, reason: "send-failed" };
    }
  },
});
