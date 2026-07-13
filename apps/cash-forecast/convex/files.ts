// スクショOCR取り込み用のファイルアップロード。通常ランタイム（ctx.db が使える）。
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePro } from "./billing";

// Convexの一時ストレージへの署名付きアップロードURLを発行する。
// 取り込みはProプラン限定機能のため、ここでゲートする（クライアント側の表示制御とは別に、
// サーバー側で必ず検証する）。
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    await requirePro(ctx, identity.subject);
    return ctx.storage.generateUploadUrl();
  },
});

// クライアント側でアップロード〜OCR抽出の途中で失敗した際の後始末用。
// アップロード済みだが extractStatement に渡せなかった storageId を削除する
// （extractStatement 自体に到達した場合は、そちらの finally が必ず削除するのでここは呼ばれない）。
//
// 権限についての判断: storageId は推測困難なランダムIDであり、かつこのアプリでは
// storageId をどのテーブルにも永続化しない（extractStatement は使用後すぐ削除する）ため、
// 「他人の未知のstorageIdを知る」経路が存在しない。よって、認証済みユーザーであれば
// 自分がアップロードしたstorageIdの削除を呼べれば十分とし、Proチェックは不要とした
// （削除は課金対象機能ではなく、後始末のためだけの操作）。
export const cleanup = mutation({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { storageIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("ログインが必要です");
    }
    for (const storageId of storageIds) {
      try {
        await ctx.storage.delete(storageId);
      } catch {
        // 既に削除済み・存在しない等は無視する（後始末なので失敗しても致命的ではない）。
      }
    }
  },
});
