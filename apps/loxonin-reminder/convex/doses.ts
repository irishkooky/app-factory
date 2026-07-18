import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const DEFAULT_NOTIFY_AFTER_MINUTES = 210;
const FUTURE_TOLERANCE_MS = 2 * 60_000;
const MAX_BACKFILL_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const take = mutation({
  args: { deviceId: v.string(), takenAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    let actualTakenAt = args.takenAt ?? now;

    if (args.takenAt !== undefined) {
      if (!Number.isFinite(args.takenAt) || !Number.isInteger(args.takenAt)) {
        throw new Error("服用日時が不正です。");
      }
      if (actualTakenAt > now + FUTURE_TOLERANCE_MS) {
        throw new Error("未来の日時は記録できません。");
      }
      if (actualTakenAt > now) {
        // 端末時計のズレ許容分(2分以内)は now に丸める
        actualTakenAt = now;
      }
      if (actualTakenAt < now - MAX_BACKFILL_AGE_MS) {
        throw new Error("30日より前の記録は追加できません。");
      }
    }

    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    let notifyAfterMinutes = DEFAULT_NOTIFY_AFTER_MINUTES;
    if (device) {
      notifyAfterMinutes = device.notifyAfterMinutes;
    } else {
      await ctx.db.insert("devices", {
        deviceId: args.deviceId,
        notifyAfterMinutes: DEFAULT_NOTIFY_AFTER_MINUTES,
        updatedAt: now,
      });
    }

    const [latest] = await ctx.db
      .query("doses")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .take(1);

    if (latest && actualTakenAt < latest.takenAt) {
      // 最新より古い記録(バックフィル): 通知予約中の dose には一切触れない。
      // 通知は常に最新の服用を基準にするため、この記録自体は通知済み扱いで挿入するのみ。
      return await ctx.db.insert("doses", {
        deviceId: args.deviceId,
        takenAt: actualTakenAt,
        notifyAt: actualTakenAt + notifyAfterMinutes * 60000,
        notified: true,
      });
    }

    // 最新の服用として記録する: 既存の未通知 dose(通知予約)はすべて無効化する
    const pendingDoses = await ctx.db
      .query("doses")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .filter((q) => q.eq(q.field("notified"), false))
      .collect();

    for (const dose of pendingDoses) {
      if (dose.scheduledId) {
        await ctx.scheduler.cancel(dose.scheduledId);
      }
      await ctx.db.patch(dose._id, { notified: true });
    }

    const notifyAt = actualTakenAt + notifyAfterMinutes * 60000;

    if (notifyAt > now) {
      const doseId = await ctx.db.insert("doses", {
        deviceId: args.deviceId,
        takenAt: actualTakenAt,
        notifyAt,
        notified: false,
      });
      const scheduledId = await ctx.scheduler.runAfter(
        notifyAt - now,
        internal.push.sendReminder,
        { doseId },
      );
      await ctx.db.patch(doseId, { scheduledId });
      return doseId;
    }

    // 通知時刻をすでに過ぎている過去記録: スケジュールせず通知済みとして挿入する
    return await ctx.db.insert("doses", {
      deviceId: args.deviceId,
      takenAt: actualTakenAt,
      notifyAt,
      notified: true,
    });
  },
});

export const remove = mutation({
  args: { deviceId: v.string(), doseId: v.id("doses") },
  handler: async (ctx, args) => {
    const dose = await ctx.db.get(args.doseId);
    if (!dose || dose.deviceId !== args.deviceId) {
      throw new Error("この記録を削除する権限がありません。");
    }
    if (dose.scheduledId) {
      await ctx.scheduler.cancel(dose.scheduledId);
    }
    await ctx.db.delete(args.doseId);
  },
});

export const list = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("doses")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .take(20);
  },
});

export const getDose = internalQuery({
  args: { doseId: v.id("doses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.doseId);
  },
});

export const markNotified = internalMutation({
  args: { doseId: v.id("doses") },
  handler: async (ctx, args) => {
    const dose = await ctx.db.get(args.doseId);
    if (!dose) {
      return;
    }
    await ctx.db.patch(args.doseId, { notified: true });
  },
});
