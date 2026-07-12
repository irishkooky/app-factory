import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new Error("メモを入力してください");
    }
    return ctx.db.insert("notes", { userId: identity.subject, text: trimmed });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    const note = await ctx.db.get(id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("このメモを削除する権限がありません");
    }
    await ctx.db.delete(id);
  },
});
