import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { pickAlias, pickPrompt } from "./prompts";
import {
  advanceIfAllAnswered,
  advanceIfAllVoted,
  requireRoom,
  requireSeatOwner,
  shuffle,
} from "./lib";

const ANSWER_DEADLINE_MS = 60_000;
const VOTE_DEADLINE_MS = 45_000;
const AI_DELAY_MIN_MS = 8_000;
const AI_DELAY_RANGE_MS = 25_000;

const OPEN_PHASES = new Set<string>(["reveal", "discussion", "voting", "result"]);

function scheduleAiDelayMs(): number {
  return AI_DELAY_MIN_MS + Math.floor(Math.random() * AI_DELAY_RANGE_MS);
}

// ---------- 公開クエリ ----------

/**
 * answering中は { phase: "hidden", submittedSeatIds } / reveal以降・過去ラウンドは
 * { phase: "open", answers: [{ seatId, text }] }
 */
export const listAnswers = query({
  args: { roomId: v.id("rooms"), roundIndex: v.number() },
  handler: async (ctx, args) => {
    const room = await requireRoom(ctx, args.roomId);

    const isPastRound = args.roundIndex < room.roundIndex;
    const isCurrentRoundOpen =
      args.roundIndex === room.roundIndex && OPEN_PHASES.has(room.phase);

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", args.roomId).eq("roundIndex", args.roundIndex),
      )
      .collect();

    if (isPastRound || isCurrentRoundOpen) {
      return {
        phase: "open" as const,
        answers: answers.map((a) => ({ seatId: a.seatId, text: a.text })),
      };
    }

    return {
      phase: "hidden" as const,
      submittedSeatIds: answers.map((a) => a.seatId),
    };
  },
});

/** voting中は投票済み人数、result では全票も含める */
export const getVoteStatus = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await requireRoom(ctx, args.roomId);

    // 人間の席数（= seatOwners の数。AIは投票しない）
    const seatOwners = await ctx.db
      .query("seatOwners")
      .withIndex("by_room_device", (q) => q.eq("roomId", args.roomId))
      .collect();
    const totalSeats = seatOwners.length;

    if (room.phase !== "voting" && room.phase !== "result") {
      return {
        votedCount: 0,
        totalSeats,
        votedSeatIds: [] as Id<"seats">[],
      };
    }

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const votedSeatIds = votes.map((vote) => vote.voterSeatId);

    if (room.phase === "result") {
      return {
        votedCount: votes.length,
        totalSeats,
        votedSeatIds,
        allVotes: votes.map((vote) => ({
          voterSeatId: vote.voterSeatId,
          targetSeatId: vote.targetSeatId,
        })),
      };
    }

    return { votedCount: votes.length, totalSeats, votedSeatIds };
  },
});

/** phase === "result" のときだけ AI席の正体と得票を返す */
export const getResult = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.phase !== "result") return null;

    const secret = await ctx.db
      .query("roomSecrets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (!secret) return null;

    const seats = await ctx.db
      .query("seats")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const countBySeat = new Map<Id<"seats">, number>();
    for (const seat of seats) countBySeat.set(seat._id, 0);
    for (const vote of votes) {
      countBySeat.set(vote.targetSeatId, (countBySeat.get(vote.targetSeatId) ?? 0) + 1);
    }

    const tally = seats
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((seat) => ({ seatId: seat._id, count: countBySeat.get(seat._id) ?? 0 }));

    const maxCount = tally.reduce((max, t) => Math.max(max, t.count), 0);
    const aiCount = countBySeat.get(secret.aiSeatId) ?? 0;
    const humansWin = aiCount === maxCount;

    return { aiSeatId: secret.aiSeatId, tally, humansWin };
  },
});

// ---------- ミューテーション ----------

/** ホストのみ・lobbyのみ・人間2席以上必須。AI席を作りorderをシャッフルして開始する */
export const startGame = mutation({
  args: { roomId: v.id("rooms"), deviceId: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireSeatOwner(ctx, args.roomId, args.deviceId);
    if (!owner.isHost) {
      throw new Error("ホストだけがゲームを開始できます。");
    }

    const room = await requireRoom(ctx, args.roomId);
    if (room.phase !== "lobby") {
      throw new Error("このゲームはすでに開始されています。");
    }

    const humanSeats = await ctx.db
      .query("seats")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    if (humanSeats.length < 2) {
      throw new Error("開始するには2人以上の参加者が必要です。");
    }

    // AI席を1つ作成し、秘密テーブルに記録する
    const aiAlias = pickAlias(humanSeats.map((seat) => seat.alias));
    const aiSeatId = await ctx.db.insert("seats", {
      roomId: args.roomId,
      alias: aiAlias,
      order: humanSeats.length,
    });
    await ctx.db.insert("roomSecrets", { roomId: args.roomId, aiSeatId });

    // 全席（AI含む）の order をシャッフルして振り直す
    const allSeats = await ctx.db
      .query("seats")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const shuffledOrders = shuffle(allSeats.map((_, i) => i));
    await Promise.all(
      allSeats.map((seat, i) => ctx.db.patch(seat._id, { order: shuffledOrders[i] })),
    );

    const promptDef = pickPrompt(0);
    await ctx.db.patch(args.roomId, {
      phase: "answering",
      roundIndex: 0,
      promptText: promptDef.text,
      deadlineAt: Date.now() + ANSWER_DEADLINE_MS,
    });

    await ctx.scheduler.runAfter(scheduleAiDelayMs(), internal.ai.generateAnswer, {
      roomId: args.roomId,
      roundIndex: 0,
    });
  },
});

/** answering中のみ。1ラウンド1回。全席揃ったら同一ミューテーション内で reveal へ */
export const submitAnswer = mutation({
  args: { roomId: v.id("rooms"), deviceId: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireSeatOwner(ctx, args.roomId, args.deviceId);
    const room = await requireRoom(ctx, args.roomId);
    if (room.phase !== "answering") {
      throw new Error("いまは回答フェーズではありません。");
    }

    const trimmed = args.text.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      throw new Error("回答は1〜120文字で入力してください。");
    }

    const existingAnswers = await ctx.db
      .query("answers")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", args.roomId).eq("roundIndex", room.roundIndex),
      )
      .collect();
    if (existingAnswers.some((a) => a.seatId === owner.seatId)) {
      throw new Error("このラウンドはすでに回答済みです。");
    }

    await ctx.db.insert("answers", {
      roomId: args.roomId,
      roundIndex: room.roundIndex,
      seatId: owner.seatId,
      text: trimmed,
    });

    await advanceIfAllAnswered(ctx, args.roomId, room.roundIndex);
  },
});

/** ホストのみ・reveal中のみ。次ラウンド or 投票フェーズへ */
export const nextRound = mutation({
  args: { roomId: v.id("rooms"), deviceId: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireSeatOwner(ctx, args.roomId, args.deviceId);
    if (!owner.isHost) {
      throw new Error("ホストだけが進行できます。");
    }

    const room = await requireRoom(ctx, args.roomId);
    if (room.phase !== "reveal") {
      throw new Error("いまは次に進めるタイミングではありません。");
    }

    if (room.roundIndex + 1 < room.totalRounds) {
      const nextIndex = room.roundIndex + 1;
      const promptDef = pickPrompt(nextIndex);
      await ctx.db.patch(args.roomId, {
        phase: "answering",
        roundIndex: nextIndex,
        promptText: promptDef.text,
        deadlineAt: Date.now() + ANSWER_DEADLINE_MS,
      });
      await ctx.scheduler.runAfter(scheduleAiDelayMs(), internal.ai.generateAnswer, {
        roomId: args.roomId,
        roundIndex: nextIndex,
      });
    } else {
      // MVPでは discussion を飛ばして投票へ
      await ctx.db.patch(args.roomId, {
        phase: "voting",
        deadlineAt: Date.now() + VOTE_DEADLINE_MS,
      });
    }
  },
});

/** voting中のみ。自席への投票は禁止。1人1票・上書き可 */
export const castVote = mutation({
  args: { roomId: v.id("rooms"), deviceId: v.string(), targetSeatId: v.id("seats") },
  handler: async (ctx, args) => {
    const owner = await requireSeatOwner(ctx, args.roomId, args.deviceId);
    const room = await requireRoom(ctx, args.roomId);
    if (room.phase !== "voting") {
      throw new Error("いまは投票フェーズではありません。");
    }

    const targetSeat = await ctx.db.get(args.targetSeatId);
    if (!targetSeat || targetSeat.roomId !== args.roomId) {
      throw new Error("投票先が不正です。");
    }
    if (args.targetSeatId === owner.seatId) {
      throw new Error("自分の席には投票できません。");
    }

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_room_voter", (q) =>
        q.eq("roomId", args.roomId).eq("voterSeatId", owner.seatId),
      )
      .first();
    if (existingVote) {
      await ctx.db.patch(existingVote._id, { targetSeatId: args.targetSeatId });
    } else {
      await ctx.db.insert("votes", {
        roomId: args.roomId,
        voterSeatId: owner.seatId,
        targetSeatId: args.targetSeatId,
      });
    }

    await advanceIfAllVoted(ctx, args.roomId);
  },
});

/** discussion中のみ（MVPのUIからは使わない。将来のdiscussionフェーズ実装用） */
export const sendMessage = mutation({
  args: { roomId: v.id("rooms"), deviceId: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireSeatOwner(ctx, args.roomId, args.deviceId);
    const room = await requireRoom(ctx, args.roomId);
    if (room.phase !== "discussion") {
      throw new Error("いまは会話フェーズではありません。");
    }

    const trimmed = args.text.trim();
    if (trimmed.length === 0 || trimmed.length > 200) {
      throw new Error("メッセージは1〜200文字で入力してください。");
    }

    await ctx.db.insert("messages", {
      roomId: args.roomId,
      seatId: owner.seatId,
      text: trimmed,
    });
  },
});
