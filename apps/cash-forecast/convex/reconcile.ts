import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assertAmount, assertAnchorBalance, assertDateString, assertMonthString, assertName } from "./validate";

// (ruleId, ruleMonth) キーに紐づく「上乗せ(addon)」行をすべて削除する。
// 上書き行・実績化行が金額を吸収した後は、内訳としての存在意義が無くなる（二重計上防止）。
async function deleteAddonsForKey(
  ctx: MutationCtx,
  userId: string,
  ruleId: Id<"rules">,
  ruleMonth: string,
): Promise<void> {
  const rows = await ctx.db
    .query("transactions")
    .withIndex("by_user_rule", (q) => q.eq("userId", userId).eq("ruleId", ruleId).eq("ruleMonth", ruleMonth))
    .collect();
  for (const row of rows) {
    if (row.addon === true) {
      await ctx.db.delete(row._id);
    }
  }
}

function assertInRange(date: string, oldAnchorDate: string, newAnchorDate: string): void {
  if (!(date > oldAnchorDate && date <= newAnchorDate)) {
    throw new ConvexError("日付が今回の照合対象期間外です");
  }
}

export const commit = mutation({
  args: {
    newAnchorDate: v.string(),
    newAnchorBalance: v.number(),
    batchId: v.string(),
    ops: v.array(
      v.union(
        v.object({
          type: v.literal("materializeRule"),
          ruleId: v.id("rules"),
          ruleMonth: v.string(),
          date: v.string(),
          name: v.string(),
          kind: v.union(v.literal("income"), v.literal("expense")),
          amount: v.number(),
        }),
        v.object({ type: v.literal("confirmTx"), txId: v.id("transactions") }),
        v.object({ type: v.literal("deleteTx"), txId: v.id("transactions") }),
        v.object({ type: v.literal("postponeTx"), txId: v.id("transactions"), newDate: v.string() }),
        v.object({
          type: v.literal("insertActual"),
          date: v.string(),
          name: v.string(),
          kind: v.union(v.literal("income"), v.literal("expense")),
          amount: v.number(),
        }),
        v.object({
          type: v.literal("dropRuleAddons"),
          ruleId: v.id("rules"),
          ruleMonth: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, { newAnchorDate, newAnchorBalance, batchId, ops }) => {
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

    assertDateString(newAnchorDate, "基準日");
    assertAnchorBalance(newAnchorBalance);
    if (batchId.trim().length === 0) {
      throw new ConvexError("batchIdが不正です");
    }
    const oldAnchorDate = settings.anchorDate;
    if (newAnchorDate < oldAnchorDate) {
      throw new ConvexError("基準日は現在より過去に戻せません");
    }

    for (const op of ops) {
      switch (op.type) {
        case "materializeRule": {
          const rule = await ctx.db.get(op.ruleId);
          if (!rule || rule.userId !== userId) {
            throw new ConvexError("権限がありません");
          }
          assertMonthString(op.ruleMonth);
          assertDateString(op.date, "日付");
          assertInRange(op.date, oldAnchorDate, newAnchorDate);
          const trimmedName = assertName(op.name);
          assertAmount(op.amount);

          const existingRows = await ctx.db
            .query("transactions")
            .withIndex("by_user_rule", (q) =>
              q.eq("userId", userId).eq("ruleId", op.ruleId).eq("ruleMonth", op.ruleMonth),
            )
            .collect();
          const hasOverride = existingRows.some((row) => row.addon !== true);
          if (hasOverride) {
            throw new ConvexError("この月は既に確定済みです");
          }

          await ctx.db.insert("transactions", {
            userId,
            date: op.date,
            name: trimmedName,
            kind: op.kind,
            amount: op.amount,
            ruleId: op.ruleId,
            ruleMonth: op.ruleMonth,
            actual: true,
            batchId,
          });

          // 表示金額はアドオン合算済みのため、上乗せ行は吸収済みとして削除する（二重計上防止）
          await deleteAddonsForKey(ctx, userId, op.ruleId, op.ruleMonth);
          break;
        }
        case "confirmTx": {
          const tx = await ctx.db.get(op.txId);
          if (!tx || tx.userId !== userId) {
            throw new ConvexError("権限がありません");
          }
          assertInRange(tx.date, oldAnchorDate, newAnchorDate);

          await ctx.db.patch(op.txId, { actual: true, batchId });

          if (tx.ruleId !== undefined && tx.ruleMonth !== undefined) {
            await deleteAddonsForKey(ctx, userId, tx.ruleId, tx.ruleMonth);
          }
          break;
        }
        case "deleteTx": {
          const tx = await ctx.db.get(op.txId);
          if (!tx || tx.userId !== userId) {
            throw new ConvexError("権限がありません");
          }
          if (tx.ruleId !== undefined && tx.ruleMonth !== undefined) {
            await deleteAddonsForKey(ctx, userId, tx.ruleId, tx.ruleMonth);
          }
          await ctx.db.delete(op.txId);
          break;
        }
        case "postponeTx": {
          const tx = await ctx.db.get(op.txId);
          if (!tx || tx.userId !== userId) {
            throw new ConvexError("権限がありません");
          }
          assertDateString(op.newDate, "先送り先の日付");
          if (op.newDate <= newAnchorDate) {
            throw new ConvexError("先送り先は新しい基準日より後にしてください");
          }
          await ctx.db.patch(op.txId, { date: op.newDate });
          break;
        }
        case "insertActual": {
          assertDateString(op.date, "日付");
          assertInRange(op.date, oldAnchorDate, newAnchorDate);
          const trimmedName = assertName(op.name);
          assertAmount(op.amount);

          await ctx.db.insert("transactions", {
            userId,
            date: op.date,
            name: trimmedName,
            kind: op.kind,
            amount: op.amount,
            actual: true,
            batchId,
          });
          break;
        }
        case "dropRuleAddons": {
          assertMonthString(op.ruleMonth);
          const rule = await ctx.db.get(op.ruleId);
          // rule が既に削除済み（孤児addon）の場合は所有権チェックをスキップし、掃除だけ行う。
          // rule が存在する場合は所有権を確認する。addon行自体は by_user_rule インデックスの
          // userId 等値条件で常にこのユーザーの行に限定されるため、個別行のuserId一致は保証済み。
          if (rule && rule.userId !== userId) {
            throw new ConvexError("権限がありません");
          }
          await deleteAddonsForKey(ctx, userId, op.ruleId, op.ruleMonth);
          break;
        }
      }
    }

    await ctx.db.patch(settings._id, { anchorDate: newAnchorDate, anchorBalance: newAnchorBalance });
  },
});
