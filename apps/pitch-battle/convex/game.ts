import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { TARGETS, TECHS, MODELS } from "./themes";
import { AMOUNTS } from "./amounts";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Identity = {
  subject: string;
  name?: string | null;
  email?: string | null;
};

// 表示名の導出。identity.name / identity.email は null・欠落がありうる前提で防御する。
function deriveName(identity: Identity): string {
  if (identity.name) {
    return identity.name;
  }
  if (identity.email) {
    const atIndex = identity.email.indexOf("@");
    return atIndex > 0 ? identity.email.slice(0, atIndex) : identity.email;
  }
  return "名無し起業家";
}

async function requireIdentity(ctx: QueryCtx | MutationCtx): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("ログインが必要です");
  }
  return identity;
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "";
}

async function findRoomByCode(ctx: QueryCtx | MutationCtx, code: string): Promise<Doc<"rooms"> | null> {
  const normalized = code.trim().toUpperCase();
  return ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .first();
}

async function getRoomByCodeOrThrow(ctx: QueryCtx | MutationCtx, code: string): Promise<Doc<"rooms">> {
  const room = await findRoomByCode(ctx, code);
  if (!room) {
    throw new Error("ルームが見つかりません");
  }
  return room;
}

async function getPlayers(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">): Promise<Doc<"players">[]> {
  return ctx.db
    .query("players")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
}

async function findPlayer(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: string,
): Promise<Doc<"players"> | null> {
  return ctx.db
    .query("players")
    .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
    .first();
}

async function findRoundByIndex(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  index: number,
): Promise<Doc<"rounds"> | null> {
  return ctx.db
    .query("rounds")
    .withIndex("by_room_index", (q) => q.eq("roomId", roomId).eq("index", index))
    .first();
}

// 現在ラウンドが open ならそれを返す。無い / closed なら null（throw しない）。
async function getOpenCurrentRound(ctx: QueryCtx | MutationCtx, room: Doc<"rooms">): Promise<Doc<"rounds"> | null> {
  if (room.roundIndex < 0) {
    return null;
  }
  const round = await findRoundByIndex(ctx, room._id, room.roundIndex);
  if (!round || round.status !== "open") {
    return null;
  }
  return round;
}

// ラウンドを締め切り、調達額を確定してピッチャーの累計に加算する共通処理。
// closeRound / finishGame の両方から呼ばれる。
async function closeRoundInternal(ctx: MutationCtx, room: Doc<"rooms">, round: Doc<"rounds">): Promise<void> {
  const investments = await ctx.db
    .query("investments")
    .withIndex("by_round", (q) => q.eq("roundId", round._id))
    .collect();
  const total = investments.reduce((sum, inv) => sum + inv.amount, 0);
  await ctx.db.patch(round._id, { status: "closed", raised: total });

  const pitcherPlayer = await findPlayer(ctx, room._id, round.pitcherId);
  if (pitcherPlayer) {
    await ctx.db.patch(pitcherPlayer._id, { totalRaised: pitcherPlayer.totalRaised + total });
  }
}

export const createRoom = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);

    let code: string | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateCode();
      const existing = await findRoomByCode(ctx, candidate);
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new Error("合言葉の生成に失敗しました。もう一度お試しください");
    }

    const roomId = await ctx.db.insert("rooms", {
      code,
      hostId: identity.subject,
      status: "lobby",
      roundIndex: -1,
    });
    await ctx.db.insert("players", {
      roomId,
      userId: identity.subject,
      name: deriveName(identity),
      totalRaised: 0,
      order: 0,
    });

    return { code };
  },
});

export const joinRoom = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const identity = await requireIdentity(ctx);
    const room = await findRoomByCode(ctx, code);
    if (!room) {
      throw new Error("その合言葉のルームはありません");
    }
    if (room.status === "finished") {
      throw new Error("このルームは終了しました");
    }

    const existing = await findPlayer(ctx, room._id, identity.subject);
    if (existing) {
      return { code: room.code };
    }

    const players = await getPlayers(ctx, room._id);
    await ctx.db.insert("players", {
      roomId: room._id,
      userId: identity.subject,
      name: deriveName(identity),
      totalRaised: 0,
      order: players.length,
    });

    return { code: room.code };
  },
});

export const getRoom = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const room = await findRoomByCode(ctx, code);
    if (!room) {
      return null;
    }

    const players = await getPlayers(ctx, room._id);
    const isMember = players.some((p) => p.userId === identity.subject);
    const isHost = room.hostId === identity.subject;

    const sortedPlayers = [...players]
      .sort((a, b) => b.totalRaised - a.totalRaised)
      .map((p) => ({
        userId: p.userId,
        name: p.name,
        totalRaised: p.totalRaised,
        isHost: p.userId === room.hostId,
      }));

    let currentRound: {
      _id: Id<"rounds">;
      index: number;
      pitcherId: string;
      pitcherName: string;
      theme: { target: string; tech: string; model: string };
      status: "open" | "closed";
      startedAt: number;
      raised: number;
      investments: { investorId: string; investorName: string; amount: number; comment: string }[];
      myInvestment: { amount: number; comment: string } | null;
    } | null = null;

    if (room.roundIndex >= 0) {
      const round = await findRoundByIndex(ctx, room._id, room.roundIndex);
      if (round) {
        const investments = await ctx.db
          .query("investments")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .collect();
        const mine = investments.find((inv) => inv.investorId === identity.subject) ?? null;

        currentRound = {
          _id: round._id,
          index: round.index,
          pitcherId: round.pitcherId,
          pitcherName: round.pitcherName,
          theme: round.theme,
          status: round.status,
          startedAt: round.startedAt,
          raised: round.raised,
          investments: investments.map((inv) => ({
            investorId: inv.investorId,
            investorName: inv.investorName,
            amount: inv.amount,
            comment: inv.comment,
          })),
          myInvestment: mine ? { amount: mine.amount, comment: mine.comment } : null,
        };
      }
    }

    return {
      room: { code: room.code, status: room.status, roundIndex: room.roundIndex },
      isHost,
      isMember,
      me: { userId: identity.subject, name: deriveName(identity) },
      players: sortedPlayers,
      amounts: AMOUNTS,
      currentRound,
    };
  },
});

export const startRound = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const identity = await requireIdentity(ctx);
    const room = await getRoomByCodeOrThrow(ctx, code);

    if (room.hostId !== identity.subject) {
      throw new Error("ホストのみ操作できます");
    }
    if (room.status === "finished") {
      throw new Error("このルームは終了しました");
    }
    if (room.roundIndex >= 0) {
      const current = await findRoundByIndex(ctx, room._id, room.roundIndex);
      if (current && current.status === "open") {
        throw new Error("ラウンド進行中です");
      }
    }

    const players = await getPlayers(ctx, room._id);
    if (players.length < 2) {
      throw new Error("2人以上必要です");
    }

    const sortedPlayers = [...players].sort((a, b) => a.order - b.order);
    const nextIndex = room.roundIndex + 1;
    const pitcher = sortedPlayers[nextIndex % sortedPlayers.length];
    if (!pitcher) {
      throw new Error("ピッチャーを決定できませんでした");
    }

    const theme = {
      target: pickRandom(TARGETS),
      tech: pickRandom(TECHS),
      model: pickRandom(MODELS),
    };

    await ctx.db.insert("rounds", {
      roomId: room._id,
      index: nextIndex,
      pitcherId: pitcher.userId,
      pitcherName: pitcher.name,
      theme,
      status: "open",
      startedAt: Date.now(),
      raised: 0,
    });
    await ctx.db.patch(room._id, { status: "playing", roundIndex: nextIndex });
  },
});

export const invest = mutation({
  args: { roundId: v.id("rounds"), amount: v.number(), comment: v.string() },
  handler: async (ctx, { roundId, amount, comment }) => {
    const identity = await requireIdentity(ctx);

    const round = await ctx.db.get(roundId);
    if (!round) {
      throw new Error("ラウンドが見つかりません");
    }
    if (round.status !== "open") {
      throw new Error("このラウンドは締め切られました");
    }

    const player = await findPlayer(ctx, round.roomId, identity.subject);
    if (!player) {
      throw new Error("ルームに参加してください");
    }
    if (round.pitcherId === identity.subject) {
      throw new Error("ピッチャーは自分に投資できません");
    }
    if (!AMOUNTS.includes(amount)) {
      throw new Error("不正な投資額です");
    }
    const trimmedComment = comment.trim();
    if (trimmedComment.length > 50) {
      throw new Error("コメントは50文字までです");
    }

    const existing = await ctx.db
      .query("investments")
      .withIndex("by_round_investor", (q) => q.eq("roundId", roundId).eq("investorId", identity.subject))
      .first();
    const investorName = deriveName(identity);

    if (existing) {
      await ctx.db.patch(existing._id, { amount, comment: trimmedComment, investorName });
    } else {
      await ctx.db.insert("investments", {
        roundId,
        investorId: identity.subject,
        investorName,
        amount,
        comment: trimmedComment,
      });
    }
  },
});

export const closeRound = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const identity = await requireIdentity(ctx);
    const room = await getRoomByCodeOrThrow(ctx, code);

    if (room.hostId !== identity.subject) {
      throw new Error("ホストのみ操作できます");
    }

    const round = await getOpenCurrentRound(ctx, room);
    if (!round) {
      throw new Error("進行中のラウンドがありません");
    }

    await closeRoundInternal(ctx, room, round);
  },
});

export const finishGame = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const identity = await requireIdentity(ctx);
    const room = await getRoomByCodeOrThrow(ctx, code);

    if (room.hostId !== identity.subject) {
      throw new Error("ホストのみ操作できます");
    }
    if (room.status !== "playing") {
      throw new Error("ゲームが始まっていません");
    }

    // 進行中のラウンドがあれば、結果発表の前に自動で締め切る。
    const round = await getOpenCurrentRound(ctx, room);
    if (round) {
      await closeRoundInternal(ctx, room, round);
    }

    await ctx.db.patch(room._id, { status: "finished" });
  },
});
