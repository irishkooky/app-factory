import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { pickAlias } from "./prompts";

const MAX_SEATS = 8;
const CODE_GEN_ATTEMPTS = 20;

async function generateUniqueCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < CODE_GEN_ATTEMPTS; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!existing) return code;
  }
  throw new Error("ルームコードの発行に失敗しました。もう一度お試しください。");
}

/** { _id, phase, roundIndex, totalRounds, promptText, deadlineAt } or null */
export const getRoom = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (!room) return null;

    return {
      _id: room._id,
      phase: room.phase,
      roundIndex: room.roundIndex,
      totalRounds: room.totalRounds,
      promptText: room.promptText,
      deadlineAt: room.deadlineAt,
    };
  },
});

/** [{ seatId, alias, order }] を order 昇順で返す。_creationTime は絶対に含めない */
export const listSeats = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const seats = await ctx.db
      .query("seats")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return seats
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((seat) => ({ seatId: seat._id, alias: seat.alias, order: seat.order }));
  },
});

/** 自分の deviceId で引いた自席。{ seatId, alias, isHost } or null */
export const getMySeat = query({
  args: { roomId: v.id("rooms"), deviceId: v.string() },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("seatOwners")
      .withIndex("by_room_device", (q) =>
        q.eq("roomId", args.roomId).eq("deviceId", args.deviceId),
      )
      .first();
    if (!owner) return null;

    const seat = await ctx.db.get(owner.seatId);
    if (!seat) return null;

    return { seatId: seat._id, alias: seat.alias, isHost: owner.isHost };
  },
});

/** 4桁コードで部屋を作成し、作成者をホストとして最初の席に着ける */
export const createRoom = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const code = await generateUniqueCode(ctx);

    const roomId = await ctx.db.insert("rooms", {
      code,
      phase: "lobby",
      roundIndex: 0,
      totalRounds: 1,
    });

    const alias = pickAlias([]);
    const seatId = await ctx.db.insert("seats", { roomId, alias, order: 0 });
    await ctx.db.insert("seatOwners", {
      roomId,
      seatId,
      deviceId: args.deviceId,
      isHost: true,
    });

    return { roomId, code };
  },
});

/** 部屋に参加する。既に参加済みなら既存席を返す（リロード復帰） */
export const joinRoom = mutation({
  args: { code: v.string(), deviceId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (!room) {
      throw new Error("部屋が見つかりません。ルームコードを確認してください。");
    }

    const existingOwner = await ctx.db
      .query("seatOwners")
      .withIndex("by_room_device", (q) =>
        q.eq("roomId", room._id).eq("deviceId", args.deviceId),
      )
      .first();
    if (existingOwner) {
      return { roomId: room._id, seatId: existingOwner.seatId };
    }

    if (room.phase !== "lobby") {
      throw new Error("ゲームは開始済みです。");
    }

    const seats = await ctx.db
      .query("seats")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    if (seats.length >= MAX_SEATS) {
      throw new Error("この部屋は満席です。");
    }

    const alias = pickAlias(seats.map((seat) => seat.alias));
    const order = seats.length;
    const seatId = await ctx.db.insert("seats", { roomId: room._id, alias, order });
    await ctx.db.insert("seatOwners", {
      roomId: room._id,
      seatId,
      deviceId: args.deviceId,
      isHost: false,
    });

    return { roomId: room._id, seatId };
  },
});
