import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// src/lib/avatars.ts と同期させること
const AVATAR_EMOJIS = ["🦊","🐻","🐱","🐶","🐰","🐼","🐯","🦁","🐸","🐧","🐢","🦄"] as const;
// src/lib/avatars.ts と同期させること
const MAX_NAME_LENGTH = 12;

// 公開URLで無制限に参加できると members.list が全件購読され続けるクライアントに
// 際限なくプッシュされるため上限を設ける
const MAX_MEMBERS = 200;

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("members").collect(),
});

// 制御文字・ゼロ幅スペース等の不可視文字を除去してから trim する
// \p{C}: Unicode の制御/書式/未割当カテゴリ全般（ゼロ幅スペース U+200B 等を含む）。
// 可読性のため代表的なゼロ幅文字・BOMも \u escape で明示しておく
// (U+200B ZERO WIDTH SPACE / U+200C ZWNJ / U+200D ZWJ / U+FEFF BOM)
const INVISIBLE_CHARS_RE = /[\p{C}​‌‍﻿]/gu;

function sanitizeName(name: string) {
  return name.replace(INVISIBLE_CHARS_RE, "").trim();
}

function validateNameAndEmoji(name: string, emoji: string) {
  const trimmed = sanitizeName(name);
  if (trimmed.length === 0) {
    throw new ConvexError("名前を入力してください");
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new ConvexError(`名前は${MAX_NAME_LENGTH}文字以内にしてください`);
  }
  if (!(AVATAR_EMOJIS as readonly string[]).includes(emoji)) {
    throw new ConvexError("その絵文字は使えません");
  }
  return trimmed;
}

export const join = mutation({
  args: { name: v.string(), emoji: v.string() },
  handler: async (ctx, args) => {
    const trimmed = validateNameAndEmoji(args.name, args.emoji);

    const memberCount = (await ctx.db.query("members").collect()).length;
    if (memberCount >= MAX_MEMBERS) {
      throw new ConvexError("参加者が上限に達しました");
    }

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
      throw new ConvexError("メンバーが見つかりません");
    }
    if (member.isBot === true) {
      throw new ConvexError("Botの名前は変更できません");
    }

    await ctx.db.patch(args.memberId, { name: trimmed, emoji: args.emoji });
  },
});
