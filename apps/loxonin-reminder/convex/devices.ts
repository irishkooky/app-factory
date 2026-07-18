import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";

const MIN_NOTIFY_AFTER_MINUTES = 60;
const MAX_NOTIFY_AFTER_MINUTES = 360;
const DEFAULT_NOTIFY_AFTER_MINUTES = 210;
const MAX_SUBSCRIPTION_LENGTH = 8000;

export const get = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    if (!device) {
      return null;
    }
    return {
      notifyAfterMinutes: device.notifyAfterMinutes,
      hasSubscription: device.subscription != null,
    };
  },
});

export const saveSubscription = mutation({
  args: { deviceId: v.string(), subscription: v.string() },
  handler: async (ctx, args) => {
    if (args.subscription.length > MAX_SUBSCRIPTION_LENGTH) {
      throw new Error("subscription が不正です（長すぎます）。");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(args.subscription);
    } catch {
      throw new Error("subscription が不正な JSON です。");
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { endpoint?: unknown }).endpoint !== "string" ||
      !(parsed as { endpoint: string }).endpoint.startsWith("https://")
    ) {
      throw new Error("subscription の endpoint が不正です。");
    }

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        subscription: args.subscription,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("devices", {
        deviceId: args.deviceId,
        subscription: args.subscription,
        notifyAfterMinutes: DEFAULT_NOTIFY_AFTER_MINUTES,
        updatedAt: Date.now(),
      });
    }
  },
});

export const removeSubscription = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    if (!existing) {
      return;
    }
    await ctx.db.patch(existing._id, {
      subscription: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const updateSettings = mutation({
  args: { deviceId: v.string(), notifyAfterMinutes: v.number() },
  handler: async (ctx, args) => {
    if (
      !Number.isInteger(args.notifyAfterMinutes) ||
      args.notifyAfterMinutes < MIN_NOTIFY_AFTER_MINUTES ||
      args.notifyAfterMinutes > MAX_NOTIFY_AFTER_MINUTES
    ) {
      throw new Error(
        `notifyAfterMinutes は ${MIN_NOTIFY_AFTER_MINUTES}〜${MAX_NOTIFY_AFTER_MINUTES} の整数で指定してください。`,
      );
    }

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        notifyAfterMinutes: args.notifyAfterMinutes,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("devices", {
        deviceId: args.deviceId,
        notifyAfterMinutes: args.notifyAfterMinutes,
        updatedAt: Date.now(),
      });
    }

    const pendingDoses = await ctx.db
      .query("doses")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .filter((q) => q.eq(q.field("notified"), false))
      .collect();

    for (const dose of pendingDoses) {
      if (dose.scheduledId) {
        await ctx.scheduler.cancel(dose.scheduledId);
      }
      const newNotifyAt = dose.takenAt + args.notifyAfterMinutes * 60000;
      const delay = Math.max(0, newNotifyAt - Date.now());
      const scheduledId = await ctx.scheduler.runAfter(
        delay,
        internal.push.sendReminder,
        { doseId: dose._id },
      );
      await ctx.db.patch(dose._id, {
        notifyAt: newNotifyAt,
        scheduledId,
      });
    }
  },
});

export const getSubscription = internalQuery({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    return device?.subscription ?? null;
  },
});
