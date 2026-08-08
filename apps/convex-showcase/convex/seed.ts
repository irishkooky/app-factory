import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingChannel = await ctx.db.query("channels").first();
    if (existingChannel !== null) {
      return "already seeded";
    }

    const akariId = await ctx.db.insert("members", {
      name: "あかり",
      emoji: "🦊",
      isBot: false,
    });
    const kentaId = await ctx.db.insert("members", {
      name: "けんた",
      emoji: "🐻",
      isBot: false,
    });
    const mioId = await ctx.db.insert("members", {
      name: "みお",
      emoji: "🐱",
      isBot: false,
    });
    const botId = await ctx.db.insert("members", {
      name: "Convex Bot",
      emoji: "🤖",
      isBot: true,
    });

    const chatId = await ctx.db.insert("channels", {
      name: "雑談",
      description: "肩の力を抜いてどうぞ",
      emoji: "💬",
    });
    const devId = await ctx.db.insert("channels", {
      name: "開発",
      description: "技術の話はこちら",
      emoji: "🛠️",
    });
    const infoId = await ctx.db.insert("channels", {
      name: "お知らせ",
      description: "運営からの連絡",
      emoji: "📢",
    });

    const insertMessage = (
      channelId: Id<"channels">,
      authorId: Id<"members">,
      body: string,
    ) => ctx.db.insert("messages", { channelId, authorId, body });

    const m1 = await insertMessage(chatId, akariId, "このチャット、リロード無しで更新されるの気持ちいい");
    const m2 = await insertMessage(chatId, kentaId, "ほんとだ、別タブで開いてみたら即反映されてびっくりした");
    await insertMessage(chatId, mioId, "今日は天気がいいから散歩日和だね");

    const m3 = await insertMessage(devId, kentaId, "Convexのスキーマ、v.id()で他テーブル参照できるの地味に便利");
    await insertMessage(devId, akariId, "サーバー側でJOINをふつうのTypeScriptで書けるのがいい");
    await insertMessage(devId, mioId, "mutationがトランザクションになってるから同時押しも安心");

    const m4 = await insertMessage(infoId, akariId, "明日メンテナンスの予定はないので通常運用です");
    await insertMessage(infoId, kentaId, "了解です、共有ありがとう");

    await ctx.db.insert("reactions", { messageId: m1, memberId: kentaId, emoji: "👍" });
    await ctx.db.insert("reactions", { messageId: m1, memberId: mioId, emoji: "🎉" });
    await ctx.db.insert("reactions", { messageId: m2, memberId: akariId, emoji: "😂" });
    await ctx.db.insert("reactions", { messageId: m3, memberId: mioId, emoji: "👀" });
    await ctx.db.insert("reactions", { messageId: m3, memberId: akariId, emoji: "❤️" });
    await ctx.db.insert("reactions", { messageId: m4, memberId: mioId, emoji: "👍" });

    return "seeded";
  },
});
