import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const BOT_REPLIES = [
  "このメッセージ、ポーリング無しで届いています⚡ Convexのクエリ購読がmutation後に自動で再実行されました",
  "ぼくの投稿はサーバー側スケジューラ（ctx.scheduler.runAfter）から来ました🤖 1.5秒後に予約されていた処理です",
  "いま画面が更新されたのは、messagesテーブルへの書き込みが listByChannel クエリを無効化→再実行→WebSocketでプッシュしたからです",
  "リロードは不要です。開いているタブすべてに同じ更新が届いています🔗",
  "この返信もmessagesテーブルへのinsert一つだけです。フロント側にキャッシュ更新コードは1行もありません",
  "リアクションを押すと reactions テーブルとのJOIN結果がまるごと再配信されます🔒",
  "サーバーからクライアントへのプッシュはConvexが標準で面倒を見てくれます。手動WebSocketの実装は不要でした",
  "members / channels / messages はすべて v.id() でつながったリレーショナルなドキュメントです👀",
];

export const reply = internalMutation({
  args: {
    channelId: v.id("channels"),
    botId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const bot = await ctx.db.get(args.botId);
    const channel = await ctx.db.get(args.channelId);
    if (bot === null || channel === null) {
      return;
    }

    const messageCountBefore = (
      await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
        .collect()
    ).length;

    const latest = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .first();

    const replyIndex = messageCountBefore % BOT_REPLIES.length;
    let text = BOT_REPLIES[replyIndex];

    const latestIsFromOther = latest !== null && latest.authorId !== args.botId;
    if (latestIsFromOther) {
      const latestAuthor = await ctx.db.get(latest.authorId);
      if (latestAuthor !== null && latestAuthor.isBot === false) {
        text = `${latestAuthor.name}さん、${text}`;
      }
    }

    await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: args.botId,
      body: text,
    });

    if (latestIsFromOther && latest !== null) {
      const existing = await ctx.db
        .query("reactions")
        .withIndex("by_message_member_emoji", (q) =>
          q
            .eq("messageId", latest._id)
            .eq("memberId", args.botId)
            .eq("emoji", "👀"),
        )
        .first();
      if (existing === null) {
        await ctx.db.insert("reactions", {
          messageId: latest._id,
          memberId: args.botId,
          emoji: "👀",
        });
      }
    }
  },
});
