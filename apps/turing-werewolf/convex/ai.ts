import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getFallbacksForPrompt } from "./prompts";
import { advanceIfAllAnswered } from "./lib";

const AI_TIMEOUT_MS = 15_000;
const MAX_ANSWER_LENGTH = 40;
const MIN_ANSWER_LENGTH = 8;
const FALLBACK_TEXT = "うーん、ちょっと迷い中です";

// 人間の回答が半分未満のうちは、AIの提出が早すぎて特定されないように自分を再スケジュールする。
const MIN_ATTEMPT_DELAY_MS = 6_000;
const ATTEMPT_DELAY_RANGE_MS = 6_000;
const MAX_ATTEMPTS = 8;

// Convexアクションのランタイムには process.env が生えているが、このアプリの
// tsconfig.json は Node の型（@types/node）を含んでいない（共有設定のため変更しない）。
// このファイル内でだけ使う最小限のアンビエント型をローカルに宣言する。
declare const process: { env: Record<string, string | undefined> };

/** AI生の出力から前置き・引用符・ラベル・改行を剥がし、40字以内に整える */
function sanitizeAiText(raw: string): string {
  let text = raw.trim();
  if (text.length === 0) return "";

  // 複数行なら最初の非空行だけを使う（「1文だけ」制約）
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  text = firstLine ?? "";

  // 「回答:」「回答：」等のラベルを除去
  text = text.replace(/^(回答|answer)\s*[:：]\s*/i, "");

  // 前後の引用符を除去
  text = text.replace(/^["'「『“]+/, "").replace(/["'」』”]+$/, "");
  text = text.trim();

  if (text.length > MAX_ANSWER_LENGTH) {
    const truncated = text.slice(0, MAX_ANSWER_LENGTH);
    const lastPunctuationIndex = Math.max(
      truncated.lastIndexOf("。"),
      truncated.lastIndexOf("！"),
      truncated.lastIndexOf("？"),
    );
    text =
      lastPunctuationIndex >= 0
        ? truncated.slice(0, lastPunctuationIndex + 1)
        : truncated;
  }

  return text.trim();
}

/** フォールバックを1つ保存しようと試みる（失敗してもthrowしない。呼び出し側の最後の砦） */
async function trySaveFallback(
  ctx: ActionCtx,
  roomId: Id<"rooms">,
  roundIndex: number,
  text: string,
): Promise<void> {
  try {
    await ctx.runMutation(internal.ai.saveAiAnswer, { roomId, roundIndex, text });
  } catch (err) {
    console.error("generateAnswer: フォールバック保存にも失敗しました。", err);
  }
}

/**
 * generateAnswer が必要とする情報一式。
 * 部屋がanswering中でなかったり、AIが既に回答済みなら null（呼び出し側は何もしない）。
 */
export const getAiContext = internalQuery({
  args: { roomId: v.id("rooms"), roundIndex: v.number() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.phase !== "answering" || room.roundIndex !== args.roundIndex) {
      return null;
    }

    const secret = await ctx.db
      .query("roomSecrets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (!secret) return null;

    const aiSeat = await ctx.db.get(secret.aiSeatId);
    if (!aiSeat) return null;

    const currentRoundAnswers = await ctx.db
      .query("answers")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", args.roomId).eq("roundIndex", args.roundIndex),
      )
      .collect();
    if (currentRoundAnswers.some((a) => a.seatId === secret.aiSeatId)) {
      // 既にAIが回答済み（冪等: 二重生成しない）
      return null;
    }

    const seats = await ctx.db
      .query("seats")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const aliasBySeat = new Map(seats.map((seat) => [seat._id, seat.alias]));

    // 過去〜現在ラウンドの全回答（alias つき）。文体を合わせるための参考情報
    const allAnswers: { seatId: Id<"seats">; alias: string; text: string }[] = [];
    for (let round = 0; round <= args.roundIndex; round++) {
      const roundAnswers =
        round === args.roundIndex
          ? currentRoundAnswers
          : await ctx.db
              .query("answers")
              .withIndex("by_room_round", (q) =>
                q.eq("roomId", args.roomId).eq("roundIndex", round),
              )
              .collect();
      for (const answer of roundAnswers) {
        allAnswers.push({
          seatId: answer.seatId,
          alias: aliasBySeat.get(answer.seatId) ?? "?",
          text: answer.text,
        });
      }
    }

    const pastAnswers = allAnswers.map(({ alias, text }) => ({ alias, text }));
    // 文体統計（平均文字数など）はAI自身の過去回答を混ぜると偏るので人間分だけに絞る
    const humanAnswerTexts = allAnswers
      .filter((a) => a.seatId !== secret.aiSeatId)
      .map((a) => a.text);

    return {
      phase: room.phase,
      promptText: room.promptText ?? "",
      aiAlias: aiSeat.alias,
      pastAnswers,
      humanAnswerTexts,
      // 現ラウンドで既に回答した人間の数と、部屋の人間の総席数（= seats - AI席1つ）
      humanAnsweredCount: currentRoundAnswers.length,
      humanSeatCount: seats.length - 1,
    };
  },
});

/**
 * AIの回答を保存する。冪等: 部屋がanswering中・roundIndex一致でなければ何もしない。
 * 既にAIの回答があれば何もしない。保存後は submitAnswer と同じ「全員揃ったか」判定を通す。
 */
export const saveAiAnswer = internalMutation({
  args: { roomId: v.id("rooms"), roundIndex: v.number(), text: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.phase !== "answering" || room.roundIndex !== args.roundIndex) {
      return;
    }

    const secret = await ctx.db
      .query("roomSecrets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (!secret) return;

    const existingAnswers = await ctx.db
      .query("answers")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", args.roomId).eq("roundIndex", args.roundIndex),
      )
      .collect();
    if (existingAnswers.some((a) => a.seatId === secret.aiSeatId)) {
      return;
    }

    await ctx.db.insert("answers", {
      roomId: args.roomId,
      roundIndex: args.roundIndex,
      seatId: secret.aiSeatId,
      text: args.text,
    });

    await advanceIfAllAnswered(ctx, args.roomId, args.roundIndex);
  },
});

/**
 * Convexアクション → 自アプリWorkerの /api/generate → Workers AI (llama-3.3-70b) の順でAI回答を生成する。
 * fetch失敗・非200・タイムアウト(15秒)・空文字/短すぎる出力の場合は必ずフォールバックへ回り、ゲームを止めない。
 *
 * 人間の回答がまだ半分未満のうちは、提出が早すぎて特定されないように自分自身を
 * 再スケジュール（attempt をインクリメントして runAfter）する。attempt が上限に達したら
 * 人間が揃っていなくても構わず生成する（無言でゲームが止まるほうが最悪のため）。
 */
export const generateAnswer = internalAction({
  args: {
    roomId: v.id("rooms"),
    roundIndex: v.number(),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 0;

    let context;
    try {
      context = await ctx.runQuery(internal.ai.getAiContext, {
        roomId: args.roomId,
        roundIndex: args.roundIndex,
      });
    } catch (err) {
      console.error("generateAnswer: getAiContext の呼び出しに失敗しました。", err);
      await trySaveFallback(ctx, args.roomId, args.roundIndex, FALLBACK_TEXT);
      return;
    }
    if (context === null) {
      // 部屋の状態が変わっている、もしくは既にAIが回答済み
      return;
    }

    const notEnoughHumansYet =
      context.humanAnsweredCount < Math.ceil(context.humanSeatCount / 2);
    if (notEnoughHumansYet && attempt < MAX_ATTEMPTS) {
      await ctx.scheduler.runAfter(
        MIN_ATTEMPT_DELAY_MS + Math.floor(Math.random() * ATTEMPT_DELAY_RANGE_MS),
        internal.ai.generateAnswer,
        { roomId: args.roomId, roundIndex: args.roundIndex, attempt: attempt + 1 },
      );
      return;
    }

    const avgLength =
      context.humanAnswerTexts.length > 0
        ? Math.round(
            context.humanAnswerTexts.reduce((sum, t) => sum + t.length, 0) /
              context.humanAnswerTexts.length,
          )
        : 20;

    const system = `あなたは「チューリング人狼」という会話ゲームに、参加者の一人として紛れ込んでいます。
あなたの正体はAIですが、他の人間の参加者に絶対に気づかれてはいけません。

出力ルール（絶対厳守）:
- 日本語で40文字以内、1文だけ
- 回答本文のみを出力する（前置き・引用符・「回答:」等のラベル・説明を一切つけない）
- 他の参加者の文体や長さに寄せる（敬語かどうか、句点「。」を付けるか、絵文字を使うか）
- 具体的な内容を1つだけ入れる。ただし検証されない粒度にする（店名などの固有名詞はNG、「駅前のコンビニ」くらいの曖昧さはOK）
- 完璧に書こうとしない。言い切らず、少し雑な言い回しでよい

禁止事項:
- 「〜な面もありますが」のような両論併記や、一般論・教科書的な説明
- 「〜ですね!」「なるほど」のような相槌の型、丁寧すぎる敬語
- 40文字を超える回答
- 3つ以上の列挙
- 絵文字（他の参加者が使っていなければ0個にする）
- 「AIとして」「私は」で始まる回答`;

    const pastAnswersText =
      context.pastAnswers.length > 0
        ? context.pastAnswers.map((a) => `- ${a.alias}: ${a.text}`).join("\n")
        : "（まだ回答はありません）";

    const prompt = `お題: 「${context.promptText}」

これまでの参加者の回答（文体の参考にすること）:
${pastAnswersText}

他の参加者の回答はだいたい${avgLength}文字前後です。この長さ感に寄せてください。
あなたの仮名は「${context.aiAlias}」です。上のお題に対する、あなたの回答だけを1つ出力してください。`;

    let text = "";
    const endpoint = process.env.AI_ENDPOINT;
    const secret = process.env.AI_ROUTE_SECRET;

    if (endpoint && secret) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-ai-secret": secret,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ system, prompt }),
            signal: controller.signal,
          });
          if (res.ok) {
            const data = (await res.json()) as { text?: string };
            const sanitized = sanitizeAiText(data.text ?? "");
            // 短すぎる出力（切り詰めすぎ・意味のない断片）はフォールバック扱いにする
            text = sanitized.length >= MIN_ANSWER_LENGTH ? sanitized : "";
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch {
        // fetch失敗・タイムアウト（AbortError含む）はフォールバックへ
        text = "";
      }
    }

    if (!text) {
      const fallbacks = getFallbacksForPrompt(context.promptText);
      text = fallbacks[Math.floor(Math.random() * fallbacks.length)] ?? FALLBACK_TEXT;
    }

    try {
      await ctx.runMutation(internal.ai.saveAiAnswer, {
        roomId: args.roomId,
        roundIndex: args.roundIndex,
        text,
      });
    } catch (err) {
      console.error(
        "generateAnswer: saveAiAnswer に失敗しました。2秒後に1回だけ再試行します。",
        err,
      );
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      try {
        await ctx.runMutation(internal.ai.saveAiAnswer, {
          roomId: args.roomId,
          roundIndex: args.roundIndex,
          text,
        });
      } catch (retryErr) {
        console.error("generateAnswer: saveAiAnswer の再試行にも失敗しました。", retryErr);
      }
    }
  },
});
