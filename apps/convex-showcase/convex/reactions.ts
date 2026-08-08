import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀"];

export const toggle = mutation({
  args: {
    messageId: v.id("messages"),
    memberId: v.id("members"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    if (!ALLOWED_EMOJIS.includes(args.emoji)) {
      throw new Error("その絵文字は使えません");
    }

    const message = await ctx.db.get(args.messageId);
    if (message === null) {
      throw new Error("メッセージが見つかりません");
    }
    const member = await ctx.db.get(args.memberId);
    if (member === null) {
      throw new Error("メンバーが見つかりません");
    }

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_member_emoji", (q) =>
        q
          .eq("messageId", args.messageId)
          .eq("memberId", args.memberId)
          .eq("emoji", args.emoji),
      )
      .first();

    if (existing !== null) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        memberId: args.memberId,
        emoji: args.emoji,
      });
    }
  },
});
