import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const listByChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(50);
    const messages = recent.reverse();

    return Promise.all(
      messages.map(async (message) => {
        const authorDoc = await ctx.db.get(message.authorId);
        const author = authorDoc ?? {
          name: "退会メンバー",
          emoji: "👻",
          isBot: false,
        };

        const reactionDocs = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        const grouped = new Map<
          string,
          { count: number; memberNames: string[]; memberIds: string[] }
        >();
        for (const reaction of reactionDocs) {
          const memberDoc = await ctx.db.get(reaction.memberId);
          const memberName = memberDoc?.name ?? "？？？";
          const entry = grouped.get(reaction.emoji) ?? {
            count: 0,
            memberNames: [],
            memberIds: [],
          };
          entry.count += 1;
          entry.memberNames.push(memberName);
          entry.memberIds.push(reaction.memberId);
          grouped.set(reaction.emoji, entry);
        }

        const reactions = Array.from(grouped.entries()).map(
          ([emoji, value]) => ({
            emoji,
            count: value.count,
            memberNames: value.memberNames,
            memberIds: value.memberIds,
          }),
        );

        return {
          _id: message._id,
          _creationTime: message._creationTime,
          body: message.body,
          author: {
            name: author.name,
            emoji: author.emoji,
            isBot: author.isBot,
          },
          reactions,
        };
      }),
    );
  },
});

export const send = mutation({
  args: {
    channelId: v.id("channels"),
    authorId: v.id("members"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const MAX_BODY_LENGTH = 500;
    const trimmed = args.body.trim();
    if (trimmed.length === 0) {
      throw new Error("メッセージを入力してください");
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      throw new Error("メッセージは500文字以内にしてください");
    }

    const channel = await ctx.db.get(args.channelId);
    if (channel === null) {
      throw new Error("チャンネルが見つかりません");
    }

    const author = await ctx.db.get(args.authorId);
    if (author === null || author.isBot === true) {
      throw new Error("投稿者が不正です");
    }

    await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: args.authorId,
      body: trimmed,
    });
  },
});

export const summonBot = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (channel === null) {
      throw new Error("チャンネルが見つかりません");
    }

    const bot = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("isBot"), true))
      .first();
    if (bot === null) {
      throw new Error("Botがまだ準備できていません");
    }

    await ctx.scheduler.runAfter(1500, internal.bot.reply, {
      channelId: args.channelId,
      botId: bot._id,
    });
  },
});
