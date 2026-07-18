import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const DEFAULT_NOTIFY_AFTER_MINUTES = 210;

export const take = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

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

    const notifyAt = now + notifyAfterMinutes * 60000;
    const doseId = await ctx.db.insert("doses", {
      deviceId: args.deviceId,
      takenAt: now,
      notifyAt,
      notified: false,
    });

    const scheduledId = await ctx.scheduler.runAfter(
      notifyAfterMinutes * 60000,
      internal.push.sendReminder,
      { doseId },
    );
    await ctx.db.patch(doseId, { scheduledId });

    return doseId;
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
