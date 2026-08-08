import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { GENERIC_FALLBACK_TEXT, getFallbacksForPrompt, pickAlias, pickAliases, pickPrompt } from "./prompts";
import {
  advanceIfAllAnswered,
  advanceIfAllVoted,
  requireRoom,
  requireSeatOwner,
  shuffle,
} from "./lib";

const ANSWER_DEADLINE_MS = 60_000;
const FORCE_ADVANCE_DELAY_MS = 60_000; // answeringの時間切れ（deadlineAtと揃える）
const VOTE_DEADLINE_MS = 45_000;
const FORCE_END_VOTING_DELAY_MS = 45_000; // votingの時間切れ（deadlineAtと揃える）
const DISCUSSION_DEADLINE_MS = 90_000;
const FORCE_END_DISCUSSION_DELAY_MS = DISCUSSION_DEADLINE_MS;
const AI_DELAY_MIN_MS = 8_000;
const AI_DELAY_RANGE_MS = 25_000;
const CHIME_DELAY_MIN_MS = 15_000;
const CHIME_DELAY_RANGE_MS = 30_000;

const OPEN_PHASES: Set<Doc<"rooms">["phase"]> = new Set([
  "reveal",
  "discussion",
  "voting",
  "result",
]);

/** seatId の文字列比較でソートする（提出/投票順から誰がAIかを推測されないようにするため） */
function compareSeatId(a: Id<"seats">, b: Id<"seats">): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function scheduleAiDelayMs(): number {
  return AI_DELAY_MIN_MS + Math.floor(Math.random() * AI_DELAY_RANGE_MS);
}

function scheduleChimeDelayMs(): number {
  return CHIME_DELAY_MIN_MS + Math.floor(Math.random() * CHIME_DELAY_RANGE_MS);
}

// ---------- フェーズ遷移の共通ヘルパー（複数の入口から呼ばれるため一箇所にまとめる） ----------

/** answering フェーズに入る。AI回答の生成予約と時間切れ強制進行の予約を必ずセットで行う */
async function enterAnsweringPhase(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  roundIndex: number,
  promptText: string,
  usedPrompts: string[],
): Promise<void> {
  await ctx.db.patch(roomId, {
    phase: "answering",
    roundIndex,
    promptText,
    deadlineAt: Date.now() + ANSWER_DEADLINE_MS,
    usedPrompts,
  });
  await ctx.scheduler.runAfter(scheduleAiDelayMs(), internal.ai.generateAnswer, {
    roomId,
    roundIndex,
  });
  await ctx.scheduler.runAfter(FORCE_ADVANCE_DELAY_MS, internal.game.forceAdvance, {
    roomId,
    roundIndex,
  });
}

/** discussion フェーズに入る。時間切れ強制終了とAI割り込みの予約を行う */
async function enterDiscussionPhase(ctx: MutationCtx, roomId: Id<"rooms">): Promise<void> {
  await ctx.db.patch(roomId, {
    phase: "discussion",
    deadlineAt: Date.now() + DISCUSSION_DEADLINE_MS,
  });
  await ctx.scheduler.runAfter(FORCE_END_DISCUSSION_DELAY_MS, internal.game.forceEndDiscussion, {
    roomId,
  });
  await ctx.scheduler.runAfter(scheduleChimeDelayMs(), internal.ai.maybeChime, { roomId });
}

/** voting フェーズに入る。時間切れ強制終了の予約を行う */
async function enterVotingPhase(ctx: MutationCtx, roomId: Id<"rooms">): Promise<void> {
  await ctx.db.patch(roomId, {
    phase: "voting",
    deadlineAt: Date.now() + VOTE_DEADLINE_MS,
  });
  await ctx.scheduler.runAfter(FORCE_END_VOTING_DELAY_MS, internal.game.forceEndVoting, {
    roomId,
  });
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
        answers: answers
          .map((a) => ({ seatId: a.seatId, text: a.text }))
          .sort((a, b) => compareSeatId(a.seatId, b.seatId)),
      };
    }

    return {
      phase: "hidden" as const,
      submittedSeatIds: answers.map((a) => a.seatId).sort(compareSeatId),
    };
  },
});

/**
 * voting中は投票済み人数のみ（result では全票も含める）。
 * votedSeatIds は返さない: AIは投票しないため「投票済みでない席＝AI」と逆算されてしまうため。
 */
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
      return { votedCount: 0, totalSeats };
    }

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (room.phase === "result") {
      return {
        votedCount: votes.length,
        totalSeats,
        allVotes: votes.map((vote) => ({
          voterSeatId: vote.voterSeatId,
          targetSeatId: vote.targetSeatId,
        })),
      };
    }

    return { votedCount: votes.length, totalSeats };
  },
});

/**
 * 自分の投票先だけを返す。{ targetSeatId } | null。
 * 自分の票しか読まないので、他人の投票先や誰が投票済みかは漏れない。
 * リロード後も選択状態を復元するために使う。
 */
export const getMyVote = query({
  args: { roomId: v.id("rooms"), deviceId: v.string() },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("seatOwners")
      .withIndex("by_room_device", (q) =>
        q.eq("roomId", args.roomId).eq("deviceId", args.deviceId),
      )
      .first();
    if (!owner) return null;

    const vote = await ctx.db
      .query("votes")
      .withIndex("by_room_voter", (q) =>
        q.eq("roomId", args.roomId).eq("voterSeatId", owner.seatId),
      )
      .first();
    if (!vote) return null;

    return { targetSeatId: vote.targetSeatId };
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
    const humansWin = maxCount > 0 && aiCount === maxCount;

    return { aiSeatId: secret.aiSeatId, tally, humansWin };
  },
});

/**
 * discussion中の自由会話ログ。[{ seatId, text, _creationTime }] を時系列（_creationTime昇順）で返す。
 * 会話は時系列であること自体が本質なので _creationTime を含めてよい（他テーブルの生返し禁止とは別枠）。
 */
export const listMessages = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return messages
      .map((m) => ({ seatId: m.seatId, text: m.text, _creationTime: m._creationTime }))
      .sort((a, b) => a._creationTime - b._creationTime);
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

    // AI席を1つ作成し、秘密テーブルに記録する（aliasはこの後すぐ全席分まとめて振り直すので仮でよい）
    const aiSeatId = await ctx.db.insert("seats", {
      roomId: args.roomId,
      alias: pickAlias(humanSeats.map((seat) => seat.alias)),
      order: humanSeats.length,
    });
    await ctx.db.insert("roomSecrets", { roomId: args.roomId, aiSeatId });

    // 全席（AI含む）の alias と order をまとめて新規に振り直す。
    // ロビーで確定していた人間の仮名をそのまま残すと「ロビーに無かった仮名＝AI」で
    // 一発でバレるため、開始時に全員分の仮名を新しく引き直す（表示順も同時にシャッフル）。
    const allSeats = await ctx.db
      .query("seats")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const newAliases = pickAliases(allSeats.length);
    const shuffledOrders = shuffle(allSeats.map((_, i) => i));
    await Promise.all(
      allSeats.map((seat, i) =>
        ctx.db.patch(seat._id, { alias: newAliases[i], order: shuffledOrders[i] }),
      ),
    );

    const promptDef = pickPrompt(0, []);
    await enterAnsweringPhase(ctx, args.roomId, 0, promptDef.text, [promptDef.text]);
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

/**
 * ホストのみ。
 * - reveal中: 次ラウンドがあれば answering へ、最終ラウンドなら discussion へ
 * - discussion中: 投票へ手動で進める（時間切れを待たずに host が早める場合）
 */
export const nextRound = mutation({
  args: { roomId: v.id("rooms"), deviceId: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireSeatOwner(ctx, args.roomId, args.deviceId);
    if (!owner.isHost) {
      throw new Error("ホストだけが進行できます。");
    }

    const room = await requireRoom(ctx, args.roomId);

    if (room.phase === "reveal") {
      if (room.roundIndex + 1 < room.totalRounds) {
        const usedPrompts = room.usedPrompts ?? [];
        const nextIndex = room.roundIndex + 1;
        const promptDef = pickPrompt(nextIndex, usedPrompts);
        await enterAnsweringPhase(ctx, args.roomId, nextIndex, promptDef.text, [
          ...usedPrompts,
          promptDef.text,
        ]);
      } else {
        await enterDiscussionPhase(ctx, args.roomId);
      }
      return;
    }

    if (room.phase === "discussion") {
      await enterVotingPhase(ctx, args.roomId);
      return;
    }

    throw new Error("いまは次に進めるタイミングではありません。");
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

/** discussion中のみ。text 1〜200字 */
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

// ---------- 内部ミューテーション（時間切れ強制進行） ----------

/**
 * answering の時間切れ。冪等: 部屋が無い/answering以外/roundIndex不一致なら黙って return
 * （既に全員回答してrevealに進んでいるケースを含む）。
 * AI席が未回答のまま時間切れになるのは絶対に避ける（無言＝AI即バレ）ので、
 * AIがまだ回答していなければここでフォールバック文を直接保存してから reveal へ進む。
 * 人間の未回答者はそのまま「未回答」としてUIに残す（回答は作らない）。
 */
export const forceAdvance = internalMutation({
  args: { roomId: v.id("rooms"), roundIndex: v.number() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.phase !== "answering" || room.roundIndex !== args.roundIndex) {
      return;
    }

    const secret = await ctx.db
      .query("roomSecrets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (secret) {
      const currentAnswers = await ctx.db
        .query("answers")
        .withIndex("by_room_round", (q) =>
          q.eq("roomId", args.roomId).eq("roundIndex", args.roundIndex),
        )
        .collect();
      const aiAlreadyAnswered = currentAnswers.some((a) => a.seatId === secret.aiSeatId);
      const humanAnswerCount = currentAnswers.filter((a) => a.seatId !== secret.aiSeatId).length;
      // 人間の回答が0件のラウンドでAIだけ回答を入れると、本文が表示される唯一の席=AI席になり
      // 秘密が完全に破れる。誰も回答していないラウンドはAIも無言のまま reveal へ進めてよい。
      if (!aiAlreadyAnswered && humanAnswerCount > 0) {
        const fallbacks = getFallbacksForPrompt(room.promptText ?? "");
        const text = fallbacks[Math.floor(Math.random() * fallbacks.length)] ?? GENERIC_FALLBACK_TEXT;
        await ctx.db.insert("answers", {
          roomId: args.roomId,
          roundIndex: args.roundIndex,
          seatId: secret.aiSeatId,
          text,
        });
      }
    }

    await ctx.db.patch(args.roomId, { phase: "reveal", deadlineAt: undefined });
  },
});

/**
 * voting の時間切れ。冪等: 部屋が無い/voting以外なら黙って return
 * （既に全員投票してresultに進んでいるケースを含む）。未投票者は棄権扱いのまま result へ進む。
 */
export const forceEndVoting = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.phase !== "voting") return;
    await ctx.db.patch(args.roomId, { phase: "result", deadlineAt: undefined });
  },
});

/**
 * discussion の時間切れ。冪等: 部屋が無い/discussion以外なら黙って return
 * （ホストが手動で投票へ進めた後のケースを含む）。voting へ進める。
 */
export const forceEndDiscussion = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.phase !== "discussion") return;
    await enterVotingPhase(ctx, args.roomId);
  },
});
