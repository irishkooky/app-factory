import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// src/lib/avatars.ts と同期させること
const AVATAR_EMOJIS = ["🦊","🐻","🐱","🐶","🐰","🐼","🐯","🦁","🐸","🐧","🐢","🦄"] as const;
// src/lib/avatars.ts と同期させること
const MAX_NAME_LENGTH = 12;

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("members").collect(),
});

function validateNameAndEmoji(name: string, emoji: string) {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("名前を入力してください");
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error("名前は12文字以内にしてください");
  }
  if (!(AVATAR_EMOJIS as readonly string[]).includes(emoji)) {
    throw new Error("その絵文字は使えません");
  }
  return trimmed;
}

export const join = mutation({
  args: { name: v.string(), emoji: v.string() },
  handler: async (ctx, args) => {
    const trimmed = validateNameAndEmoji(args.name, args.emoji);
    const id = await ctx.db.insert("members", {
      name: trimmed,
      emoji: args.emoji,
      isBot: false,
    });
    return id;
  },
});

export const rename = mutation({
  args: { memberId: v.id("members"), name: v.string(), emoji: v.string() },
  handler: async (ctx, args) => {
    const trimmed = validateNameAndEmoji(args.name, args.emoji);

    const member = await ctx.db.get(args.memberId);
    if (member === null) {
      throw new Error("メンバーが見つかりません");
    }
    if (member.isBot === true) {
      throw new Error("Botの名前は変更できません");
    }

    await ctx.db.patch(args.memberId, { name: trimmed, emoji: args.emoji });
  },
});
