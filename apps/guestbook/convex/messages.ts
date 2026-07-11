import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("messages").order("desc").take(50),
});

export const add = mutation({
  args: { name: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (text.length === 0) {
      throw new Error("メッセージを入力してください。");
    }
    if (text.length > 200) {
      throw new Error("メッセージは200文字以内で入力してください。");
    }

    let name = args.name.trim();
    if (name.length === 0) {
      name = "名無しさん";
    } else if (name.length > 30) {
      throw new Error("名前は30文字以内で入力してください。");
    }

    await ctx.db.insert("messages", { name, text });
  },
});
