// game.ts と ai.ts から共有される純粋なヘルパー関数群。
// Convexの公開/内部関数はここには置かない（query/mutation/actionの定義は各ファイルへ）。

import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/** deviceId から自席（seatOwners）を解決する。見つからなければ throw */
export async function requireSeatOwner(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  deviceId: string,
): Promise<Doc<"seatOwners">> {
  const seatOwner = await ctx.db
    .query("seatOwners")
    .withIndex("by_room_device", (q) =>
      q.eq("roomId", roomId).eq("deviceId", deviceId),
    )
    .first();
  if (!seatOwner) {
    throw new Error("この部屋の席が見つかりません。参加し直してください。");
  }
  return seatOwner;
}

/** roomId から部屋を取得する。見つからなければ throw */
export async function requireRoom(
  ctx: MutationCtx | QueryCtx,
  roomId: Id<"rooms">,
): Promise<Doc<"rooms">> {
  const room = await ctx.db.get(roomId);
  if (!room) {
    throw new Error("部屋が見つかりません。");
  }
  return room;
}

/**
 * 現ラウンドの回答が全席分揃っていれば phase を "reveal" に進める。
 * submitAnswer（人間）と saveAiAnswer（AI）の両方から呼ばれる共通ロジック。
 */
export async function advanceIfAllAnswered(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  roundIndex: number,
): Promise<void> {
  const room = await ctx.db.get(roomId);
  if (!room || room.phase !== "answering" || room.roundIndex !== roundIndex) {
    return;
  }

  const seats = await ctx.db
    .query("seats")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  if (seats.length === 0) return;

  const answers = await ctx.db
    .query("answers")
    .withIndex("by_room_round", (q) =>
      q.eq("roomId", roomId).eq("roundIndex", roundIndex),
    )
    .collect();

  if (answers.length >= seats.length) {
    await ctx.db.patch(roomId, { phase: "reveal", deadlineAt: undefined });
  }
}

/**
 * 人間の全席（seatOwners の数）が投票し終えていれば phase を "result" に進める。
 * AIは投票しないので、投票主体は常に人間席のみ。
 */
export async function advanceIfAllVoted(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
): Promise<void> {
  const room = await ctx.db.get(roomId);
  if (!room || room.phase !== "voting") return;

  const seatOwners = await ctx.db
    .query("seatOwners")
    .withIndex("by_room_device", (q) => q.eq("roomId", roomId))
    .collect();
  if (seatOwners.length === 0) return;

  const votes = await ctx.db
    .query("votes")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();

  if (votes.length >= seatOwners.length) {
    await ctx.db.patch(roomId, { phase: "result", deadlineAt: undefined });
  }
}

/** Fisher–Yates シャッフル。元の配列は変更しない */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
