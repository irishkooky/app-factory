import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertAnchorBalance, assertDateString, assertThreshold } from "./validate";

const DEFAULT_THRESHOLD = 100_000;

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    return settings ?? null;
  },
});

export const setAnchor = mutation({
  args: { anchorDate: v.string(), anchorBalance: v.number() },
  handler: async (ctx, { anchorDate, anchorBalance }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    assertDateString(anchorDate, "基準日");
    assertAnchorBalance(anchorBalance);

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { anchorDate, anchorBalance });
      return existing._id;
    }
    return ctx.db.insert("settings", {
      userId: identity.subject,
      anchorDate,
      anchorBalance,
      threshold: DEFAULT_THRESHOLD,
    });
  },
});

export const setThreshold = mutation({
  args: { threshold: v.number() },
  handler: async (ctx, { threshold }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    assertThreshold(threshold);

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!existing) {
      throw new Error("先に残高の初期設定を行ってください");
    }
    await ctx.db.patch(existing._id, { threshold });
  },
});
