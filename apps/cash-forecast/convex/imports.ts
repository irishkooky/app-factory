// 日本政策金融公庫の返済予定表PDFなど、外部フォーマットから取り込んだ返済予定を
// transactions に一括登録するための Convex 関数。
// クライアント側の分類（past/duplicate等）は信用せず、ここでも同じ条件で再検証・skipする。

import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertAmount, assertDateString, assertName } from "./validate";

const MIN_ROWS = 1;
const MAX_ROWS = 400;
const MAX_IMPORT_KEY_LENGTH = 200;

export const commit = mutation({
  args: {
    importBatchId: v.string(),
    rows: v.array(
      v.object({
        importKey: v.string(),
        date: v.string(),
        name: v.string(),
        kind: v.union(v.literal("income"), v.literal("expense")),
        amount: v.number(),
      }),
    ),
  },
  returns: v.object({
    inserted: v.number(),
    skippedPast: v.number(),
    skippedDuplicate: v.number(),
  }),
  handler: async (ctx, { importBatchId, rows }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    const userId = identity.subject;

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!settings) {
      throw new ConvexError("先に残高の初期設定を行ってください");
    }

    if (importBatchId.trim().length === 0) {
      throw new ConvexError("importBatchIdが不正です");
    }

    if (rows.length < MIN_ROWS || rows.length > MAX_ROWS) {
      throw new ConvexError("取り込める行数は1件以上400件以下です");
    }

    // 途中で失敗して半端に insert されないよう、先に全件を検証してから書き込みに入る。
    const trimmedRows = rows.map((row) => {
      assertDateString(row.date);
      const trimmedName = assertName(row.name);
      assertAmount(row.amount);
      const trimmedImportKey = row.importKey.trim();
      if (trimmedImportKey.length === 0 || trimmedImportKey.length > MAX_IMPORT_KEY_LENGTH) {
        throw new ConvexError("importKeyが不正です");
      }
      return { ...row, name: trimmedName, importKey: trimmedImportKey };
    });

    let inserted = 0;
    let skippedPast = 0;
    let skippedDuplicate = 0;
    const seenImportKeys = new Set<string>();

    for (const row of trimmedRows) {
      if (seenImportKeys.has(row.importKey)) {
        skippedDuplicate++;
        continue;
      }
      seenImportKeys.add(row.importKey);

      if (row.date <= settings.anchorDate) {
        skippedPast++;
        continue;
      }

      // .unique() ではなく .first() を使う: importKey の一意性はアプリ側で担保しているが、
      // 何らかの理由で重複行が存在してもクラッシュさせず、重複扱いでskipできるようにする。
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_user_import_key", (q) => q.eq("userId", userId).eq("importKey", row.importKey))
        .first();
      if (existing) {
        skippedDuplicate++;
        continue;
      }

      await ctx.db.insert("transactions", {
        userId,
        date: row.date,
        name: row.name,
        kind: row.kind,
        amount: row.amount,
        importBatchId,
        importKey: row.importKey,
      });
      inserted++;
    }

    return { inserted, skippedPast, skippedDuplicate };
  },
});

export const undo = mutation({
  args: { importBatchId: v.string() },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, { importBatchId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("ログインが必要です");
    }
    const userId = identity.subject;

    if (importBatchId.trim().length === 0) {
      throw new ConvexError("importBatchIdが不正です");
    }

    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_import_batch", (q) => q.eq("userId", userId).eq("importBatchId", importBatchId))
      .collect();

    let deleted = 0;
    for (const row of rows) {
      if (row.actual === true) continue;
      await ctx.db.delete(row._id);
      deleted++;
    }

    return { deleted };
  },
});
