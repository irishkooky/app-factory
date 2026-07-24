import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v, ConvexError } from "convex/values";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;
const MAX_CODE_ATTEMPTS = 10;

const TECHS = [
  "生成AI",
  "ブロックチェーン",
  "ドローン",
  "VR",
  "IoT",
  "量子コンピュータ",
  "衛星データ",
  "ヒューマノイドロボット",
  "脳波センサー",
  "3Dプリンタ",
  "自動運転",
  "音声クローン",
  "ウェアラブル",
  "デジタルツイン",
  "ゲノム編集",
];
const MARKETS = [
  "銭湯",
  "高齢者",
  "保育園",
  "農家",
  "居酒屋",
  "ペット",
  "単身赴任",
  "婚活",
  "寺社仏閣",
  "漁師",
  "理髪店",
  "満員電車",
  "温泉旅館",
  "部活動",
  "フリーランス",
  "二日酔いの人",
  "PTA",
  "プロ雀士",
];
const MODELS = [
  "サブスク",
  "フリーミアム",
  "マッチング",
  "シェアリング",
  "D2C",
  "ライブコマース",
  "従量課金",
  "レベニューシェア",
  "広告モデル",
  "月額ガチャ",
  "成果報酬",
  "オークション",
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

type Identity = {
  subject: string;
  name?: string | null;
  email?: string | null;
  pictureUrl?: string | null;
};

async function requireIdentity(ctx: QueryCtx | MutationCtx): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("ログインが必要です");
  }
  return identity;
}

function displayName(identity: Identity): string {
  return identity.name ?? identity.email ?? "名無しの起業家";
}

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function findRoomByCode(ctx: QueryCtx | MutationCtx, code: string) {
  const normalized = code.trim().toUpperCase();
  return ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .first();
}

async function findPlayer(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">, userId: string) {
  return ctx.db
    .query("players")
    .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
    .first();
}

async function generateUniqueCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
    const code = randomCode();
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!existing) {
      return code;
    }
  }
  throw new ConvexError("ルームコードの生成に失敗しました。もう一度お試しください");
}

// ---------- mutations ----------

export const createRoom = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const code = await generateUniqueCode(ctx);
    const roomId = await ctx.db.insert("rooms", { code, createdBy: identity.subject });
    await ctx.db.insert("players", {
      roomId,
      userId: identity.subject,
      name: displayName(identity),
      avatarUrl: identity.pictureUrl ?? undefined,
    });
    return code;
  },
});

export const joinRoom = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const identity = await requireIdentity(ctx);
    const room = await findRoomByCode(ctx, code);
    if (!room) {
      throw new ConvexError("ルームが見つかりません");
    }
    const existing = await findPlayer(ctx, room._id, identity.subject);
    const name = displayName(identity);
    const avatarUrl = identity.pictureUrl ?? undefined;
    if (existing) {
      await ctx.db.patch(existing._id, { name, avatarUrl });
    } else {
      await ctx.db.insert("players", {
        roomId: room._id,
        userId: identity.subject,
        name,
        avatarUrl,
      });
    }
    return room.code;
  },
});

export const startRound = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const identity = await requireIdentity(ctx);
    const player = await findPlayer(ctx, roomId, identity.subject);
    if (!player) {
      throw new ConvexError("このルームの参加者ではありません");
    }
    const active = await ctx.db
      .query("rounds")
      .withIndex("by_room_status", (q) => q.eq("roomId", roomId).eq("status", "pitching"))
      .first();
    if (active) {
      throw new ConvexError("進行中のピッチがあります");
    }
    return ctx.db.insert("rounds", {
      roomId,
      pitcherUserId: identity.subject,
      pitcherName: player.name,
      themeTech: pick(TECHS),
      themeMarket: pick(MARKETS),
      themeModel: pick(MODELS),
      status: "pitching",
      startedAt: Date.now(),
    });
  },
});

export const endRound = mutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, { roundId }) => {
    const identity = await requireIdentity(ctx);
    const round = await ctx.db.get(roundId);
    if (!round) {
      throw new ConvexError("ラウンドが見つかりません");
    }
    const player = await findPlayer(ctx, round.roomId, identity.subject);
    if (!player) {
      throw new ConvexError("このルームの参加者ではありません");
    }
    if (round.status === "ended") {
      return;
    }
    await ctx.db.patch(roundId, { status: "ended", endedAt: Date.now() });
  },
});

export const invest = mutation({
  args: {
    roundId: v.id("rounds"),
    amount: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { roundId, amount, comment }) => {
    const identity = await requireIdentity(ctx);
    const round = await ctx.db.get(roundId);
    if (!round) {
      throw new ConvexError("ラウンドが見つかりません");
    }
    if (round.status !== "pitching") {
      throw new ConvexError("このピッチは終了しています");
    }
    const player = await findPlayer(ctx, round.roomId, identity.subject);
    if (!player) {
      throw new ConvexError("このルームの参加者ではありません");
    }
    if (identity.subject === round.pitcherUserId) {
      throw new ConvexError("自分のピッチには投資できません");
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 10) {
      throw new ConvexError("投資額は1〜10億円の整数で指定してください");
    }
    const trimmedComment = comment?.slice(0, 50);
    const name = displayName(identity);
    const existing = await ctx.db
      .query("investments")
      .withIndex("by_round_investor", (q) =>
        q.eq("roundId", roundId).eq("investorUserId", identity.subject),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        amount,
        comment: trimmedComment,
        investorName: name,
      });
    } else {
      await ctx.db.insert("investments", {
        roundId,
        roomId: round.roomId,
        investorUserId: identity.subject,
        investorName: name,
        amount,
        comment: trimmedComment,
      });
    }
  },
});

// ---------- queries ----------

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
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const isMember = players.some((p) => p.userId === identity.subject);
    return { room, players, isMember };
  },
});

export const currentRound = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_status", (q) => q.eq("roomId", roomId).eq("status", "pitching"))
      .first();
    if (!round) {
      return null;
    }
    const investments = await ctx.db
      .query("investments")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();
    const total = investments.reduce((sum, inv) => sum + inv.amount, 0);
    return { round, investments, total };
  },
});

export const leaderboard = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const roundsById = new Map(rounds.map((r) => [r._id, r]));

    const investments = await ctx.db
      .query("investments")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    const totals = new Map<string, { userId: string; name: string; total: number }>();
    for (const round of rounds) {
      if (!totals.has(round.pitcherUserId)) {
        totals.set(round.pitcherUserId, {
          userId: round.pitcherUserId,
          name: round.pitcherName,
          total: 0,
        });
      }
    }
    for (const inv of investments) {
      const round = roundsById.get(inv.roundId);
      if (!round) continue;
      const entry = totals.get(round.pitcherUserId);
      if (entry) {
        entry.total += inv.amount;
      }
    }

    const roundCounts = new Map<string, number>();
    for (const round of rounds) {
      roundCounts.set(round.pitcherUserId, (roundCounts.get(round.pitcherUserId) ?? 0) + 1);
    }

    return Array.from(totals.values())
      .map((entry) => ({ ...entry, roundCount: roundCounts.get(entry.userId) ?? 0 }))
      .sort((a, b) => b.total - a.total);
  },
});

export const history = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const ended = rounds
      .filter((r) => r.status === "ended")
      .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))
      .slice(0, 10);

    const results = [];
    for (const round of ended) {
      const investments = await ctx.db
        .query("investments")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .collect();
      const total = investments.reduce((sum, inv) => sum + inv.amount, 0);
      results.push({ round, total });
    }
    return results;
  },
});
