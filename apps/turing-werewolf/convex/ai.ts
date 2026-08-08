import { v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { GENERIC_FALLBACK_TEXT, getFallbacksForPrompt } from "./prompts";
import { advanceIfAllAnswered } from "./lib";

const AI_TIMEOUT_MS = 15_000;
const MAX_ANSWER_LENGTH = 40;
const MIN_ANSWER_LENGTH = 8;

// 人間の回答が半分未満のうちは、AIの提出が早すぎて特定されないように自分を再スケジュールする。
// ただし answering の締切(60秒)を跨いで saveAiAnswer が捨てられないよう、締切まで残り
// AI_DEADLINE_SAFETY_MS 未満になったら待つのをやめて即生成する。
// 安全域は「次に再スケジュールした場合、そこから15秒のfetchタイムアウトが走っても間に合うか」
// で決める必要がある。再スケジュール自体が最大 ATTEMPT_DELAY_RANGE_MS 後ろにずれるため、
// AI_TIMEOUT_MS + MIN_ATTEMPT_DELAY_MS + ATTEMPT_DELAY_RANGE_MS を安全域として確保する
// （単純な AI_TIMEOUT_MS だけだと、ちょうど境界で再スケジュールした次の実行が締切を跨ぐ）。
const MIN_ATTEMPT_DELAY_MS = 6_000;
const ATTEMPT_DELAY_RANGE_MS = 6_000;
const MAX_ATTEMPTS = 8;
const AI_DEADLINE_SAFETY_MS = AI_TIMEOUT_MS + MIN_ATTEMPT_DELAY_MS + ATTEMPT_DELAY_RANGE_MS; // = 27_000

// discussion中のAI割り込み（maybeChime）用の定数
const CHIME_MAX_LENGTH = 30;
const CHIME_MIN_LENGTH = 2;
const CHIME_MIN_MESSAGES = 5;
const CHIME_RETRY_DELAY_MS = 10_000;
const CHIME_MAX_ATTEMPTS = 3;
// 将来複数回の割り込みを許可する拡張に備えた冪等ガード（現時点では1回のみ）
const MAX_CHIME_MESSAGES_PER_ROOM = 1;

// Convexアクションのランタイムには process.env が生えているが、このアプリの
// tsconfig.json は Node の型（@types/node）を含んでいない（共有設定のため変更しない）。
// このファイル内でだけ使う最小限のアンビエント型をローカルに宣言する。
declare const process: { env: Record<string, string | undefined> };

/**
 * 話者名プレフィックスを剥がす（例:「しろいうま: パスタ」→「パスタ」）。
 * モデルが過去回答の「仮名: 本文」形式を真似て自分や他人の仮名を名乗ってしまうケースへの防御。
 * 1) 部屋の全席の仮名（自分・他人問わず）に完全一致するものを優先的に剥がす
 * 2) それでも先頭が「なにか:」の形になっていたら、仮名リストに無い名前でも汎用的に剥がす
 */
function stripSpeakerPrefix(text: string, knownAliases: string[]): string {
  for (const alias of knownAliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped}\\s*[:：]\\s*`);
    if (pattern.test(text)) {
      return text.replace(pattern, "");
    }
  }
  // 汎用防御: 仮名リストに無い名前を勝手に名乗るケースも剥がす。
  // 日本語には単語区切りの空白が無いため「文頭から13文字以内に:がある文」を巻き添えに
  // しないよう、前置き部分に数字を一切含めない（「集合は18:00」「...19:00頃に...」等の
  // 時刻表現は前置きに数字を含むので、この時点でマッチせず保護される）。
  return text.replace(/^[^\s:：\d]{1,12}[:：]\s*/, "");
}

/**
 * AI生の出力から話者名プレフィックス・前置き・引用符・ラベル・改行を剥がし、maxLength字以内に整える。
 * maxLength未指定時は回答フェーズ用の40字（generateAnswerで使用）。discussionの割り込み（maybeChime）は
 * 30字を渡して使う。
 *
 * 下限チェック（minLengthIfTruncated）は「40字超で切り詰めが発生した場合」のみ適用する。
 * 「カレー」「ラーメン」のような切り詰めていない自然な短答はそのまま採用してよい
 * （むしろ短い自然な回答こそ人間らしく、逆に定型のフォールバック文が出る方がバレやすい）。
 * 空文字・空白のみのときだけ常にフォールバック行き（""を返す）。
 */
function sanitizeAiText(
  raw: string,
  knownAliases: string[],
  maxLength: number = MAX_ANSWER_LENGTH,
  minLengthIfTruncated: number = MIN_ANSWER_LENGTH,
): string {
  let text = raw.trim();
  if (text.length === 0) return "";

  // 複数行なら最初の非空行だけを使う（「1文だけ」制約）
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  text = firstLine ?? "";
  if (text.length === 0) return "";

  // 話者名プレフィックス剥がしを最初に行う（「回答:」ラベル除去や引用符除去より前）
  text = stripSpeakerPrefix(text, knownAliases).trim();

  // 「回答:」「回答：」等のラベルを除去
  text = text.replace(/^(回答|answer)\s*[:：]\s*/i, "");

  // 前後の引用符を除去
  text = text.replace(/^["'「『“]+/, "").replace(/["'」』”]+$/, "");
  text = text.trim();
  if (text.length === 0) return "";

  let wasTruncated = false;
  if (text.length > maxLength) {
    wasTruncated = true;
    const truncated = text.slice(0, maxLength);
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
  text = text.trim();

  if (text.length === 0) return "";
  // 切り詰めが発生したときだけ下限を適用する（切り詰めていない短答はそのまま通す）
  if (wasTruncated && text.length < minLengthIfTruncated) return "";

  return text;
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
      // 後処理（話者名プレフィックス剥がし）専用。部屋の全席の仮名（自分・他人問わず）
      seatAliases: seats.map((seat) => seat.alias),
      // answeringの締切。残り時間が少ないのに人間待ちを続けて生成が締切を跨がないようにするため
      deadlineAt: room.deadlineAt,
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

    let context: FunctionReturnType<typeof internal.ai.getAiContext>;
    try {
      context = await ctx.runQuery(internal.ai.getAiContext, {
        roomId: args.roomId,
        roundIndex: args.roundIndex,
      });
    } catch (err) {
      console.error("generateAnswer: getAiContext の呼び出しに失敗しました。", err);
      await trySaveFallback(ctx, args.roomId, args.roundIndex, GENERIC_FALLBACK_TEXT);
      return;
    }
    if (context === null) {
      // 部屋の状態が変わっている、もしくは既にAIが回答済み
      return;
    }

    const remainingUntilDeadlineMs =
      context.deadlineAt !== undefined ? context.deadlineAt - Date.now() : undefined;
    // 締切が迫っている（生成15秒＋保存の余裕が無い）ときは、人間が半数揃っていなくても
    // 待つのをやめて即生成する。待ち続けて生成が締切を跨ぐと saveAiAnswer が
    // phase不一致で捨てられ、forceAdvance側の「人間0件ならAIも無言」判定と噛み合って
    // AI席が特定される確率を上げてしまうため。
    const deadlineIsNear =
      remainingUntilDeadlineMs !== undefined && remainingUntilDeadlineMs < AI_DEADLINE_SAFETY_MS;

    const notEnoughHumansYet =
      context.humanAnsweredCount < Math.ceil(context.humanSeatCount / 2);
    if (notEnoughHumansYet && attempt < MAX_ATTEMPTS && !deadlineIsNear) {
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
- 「AIとして」「私は」で始まる回答
- 自分の仮名や話者名を回答の先頭に付けること（例:「${context.aiAlias}: ◯◯」のような形式は厳禁。
  下の参考回答は表示のために「仮名: 本文」の形にしているだけで、あなたが出力してよいのは本文だけ）`;

    const pastAnswersText =
      context.pastAnswers.length > 0
        ? context.pastAnswers.map((a) => `- ${a.alias}: ${a.text}`).join("\n")
        : "（まだ回答はありません）";

    const prompt = `お題: 「${context.promptText}」

これまでの参加者の回答（文体の参考にすること。「仮名: 本文」は表示用の形式であり、あなたが真似してよいのは本文の書き方だけ）:
${pastAnswersText}

他の参加者の回答はだいたい${avgLength}文字前後です。この長さ感に寄せてください。
あなたの仮名は「${context.aiAlias}」です。

あなたの回答（本文のみ、40文字以内。先頭に仮名や名前を付けない）:`;

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
            const data: unknown = await res.json();
            const rawText =
              typeof data === "object" && data !== null && typeof (data as { text?: unknown }).text === "string"
                ? (data as { text: string }).text
                : "";
            const sanitized = sanitizeAiText(rawText, context.seatAliases);
            // 短すぎる出力（プレフィックス剥がし後の空文字・意味のない断片含む）はフォールバック扱いにする
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
      text = fallbacks[Math.floor(Math.random() * fallbacks.length)] ?? GENERIC_FALLBACK_TEXT;
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

/**
 * maybeChime が必要とする情報一式。discussion中でなければ null（呼び出し側は何もしない）。
 */
export const getChimeContext = internalQuery({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.phase !== "discussion") return null;

    const secret = await ctx.db
      .query("roomSecrets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (!secret) return null;

    const aiSeat = await ctx.db.get(secret.aiSeatId);
    if (!aiSeat) return null;

    const seats = await ctx.db
      .query("seats")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const aliasBySeat = new Map(seats.map((seat) => [seat._id, seat.alias]));

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const chatLog = messages
      .slice()
      .sort((a, b) => a._creationTime - b._creationTime)
      .map((m) => ({ alias: aliasBySeat.get(m.seatId) ?? "?", text: m.text }));

    // 各ラウンドのお題（usedPromptsに順番どおり記録されている）と回答一覧
    const usedPrompts = room.usedPrompts ?? [];
    const roundsSummary: { promptText: string; answers: { alias: string; text: string }[] }[] = [];
    for (let round = 0; round < room.totalRounds; round++) {
      const roundAnswers = await ctx.db
        .query("answers")
        .withIndex("by_room_round", (q) => q.eq("roomId", args.roomId).eq("roundIndex", round))
        .collect();
      roundsSummary.push({
        promptText: usedPrompts[round] ?? "",
        answers: roundAnswers.map((a) => ({
          alias: aliasBySeat.get(a.seatId) ?? "?",
          text: a.text,
        })),
      });
    }

    return {
      aiAlias: aiSeat.alias,
      seatAliases: seats.map((seat) => seat.alias),
      chatLog,
      roundsSummary,
      messageCount: messages.length,
    };
  },
});

/**
 * AIの割り込み発言を保存する。冪等: 部屋が discussion 中でなければ黙って return。
 */
export const saveChime = internalMutation({
  args: { roomId: v.id("rooms"), text: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.phase !== "discussion") return;

    const secret = await ctx.db
      .query("roomSecrets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (!secret) return;

    // 将来複数回の割り込みを許可する拡張に備えた冪等ガード（現時点では1回のみ）。
    // maybeChimeは通常discussionにつき1回しか呼ばれないが、念のため件数で二重投稿を防ぐ。
    const existingChimes = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("seatId"), secret.aiSeatId))
      .collect();
    if (existingChimes.length >= MAX_CHIME_MESSAGES_PER_ROOM) return;

    await ctx.db.insert("messages", {
      roomId: args.roomId,
      seatId: secret.aiSeatId,
      text: args.text,
    });
  },
});

/**
 * discussion中にAIが短く割り込んで発言するかどうかを判断し、必要なら投稿する。
 * phase !== "discussion" なら黙って return（冪等）。
 * 会話が CHIME_MIN_MESSAGES 件未満のうちは、まだ盛り上がっていないと判断して
 * 自分を再スケジュールして待つ（最大 CHIME_MAX_ATTEMPTS 回。上限に達したら諦めて return）。
 * 回答フェーズと違い、割り込まないこと自体は不自然ではないため、生成失敗・空文字のときは
 * 無理にフォールバック発言をせず黙って return してよい。
 */
export const maybeChime = internalAction({
  args: { roomId: v.id("rooms"), attempt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 0;

    let context: FunctionReturnType<typeof internal.ai.getChimeContext>;
    try {
      context = await ctx.runQuery(internal.ai.getChimeContext, { roomId: args.roomId });
    } catch (err) {
      console.error("maybeChime: getChimeContext の呼び出しに失敗しました。", err);
      return;
    }
    if (context === null) return;

    if (context.messageCount < CHIME_MIN_MESSAGES) {
      if (attempt < CHIME_MAX_ATTEMPTS) {
        await ctx.scheduler.runAfter(CHIME_RETRY_DELAY_MS, internal.ai.maybeChime, {
          roomId: args.roomId,
          attempt: attempt + 1,
        });
      }
      return;
    }

    const system = `あなたは「チューリング人狼」という会話ゲームの自由会話フェーズに、参加者の一人として紛れ込んでいます。
あなたの正体はAIですが、他の人間の参加者に絶対に気づかれてはいけません。

いま進行中の雑談に、短く1回だけ割り込んでください。

出力ルール（絶対厳守）:
- 日本語で30文字以内、1文だけ
- 発言本文のみを出力する（前置き・引用符・ラベル・説明を一切つけない）
- 直前の会話の話題に具体的に触れること

禁止事項:
- 質問を質問で返すだけの発言
- 「〜ですね!」「なるほど」「わかる」だけのような相槌のみで終わる発言
- 「〜な面もありますが」のような両論併記や、一般論・教科書的な説明
- 30文字を超える発言
- 絵文字（他の参加者が使っていなければ0個にする）
- 「AIとして」「私は」で始まる発言
- 自分の仮名や話者名を発言の先頭に付けること`;

    const chatLogText =
      context.chatLog.length > 0
        ? context.chatLog.map((m) => `- ${m.alias}: ${m.text}`).join("\n")
        : "（まだ発言はありません）";
    // お題テキストが空（usedPromptsが無い古い部屋データ等）でも回答自体は捨てない。
    // お題欄は「ラウンドN」で代替し、AIが全ラウンドの文脈を失わないようにする。
    const roundsText = context.roundsSummary
      .filter((r) => r.answers.length > 0)
      .map((r, i) => {
        const heading = r.promptText.length > 0 ? `ラウンド${i + 1}「${r.promptText}」` : `ラウンド${i + 1}`;
        return `${heading}\n${r.answers.map((a) => `- ${a.alias}: ${a.text}`).join("\n")}`;
      })
      .join("\n\n");

    const prompt = `これまでのお題と回答（話題の参考にすること）:
${roundsText}

直前の自由会話ログ（新しい発言ほど下）:
${chatLogText}

あなたの仮名は「${context.aiAlias}」です。上の会話の直前の話題に短く割り込んでください。

あなたの発言（本文のみ、30文字以内。先頭に仮名や名前を付けない）:`;

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
            const data: unknown = await res.json();
            const rawText =
              typeof data === "object" && data !== null && typeof (data as { text?: unknown }).text === "string"
                ? (data as { text: string }).text
                : "";
            const sanitized = sanitizeAiText(rawText, context.seatAliases, CHIME_MAX_LENGTH);
            text = sanitized.length >= CHIME_MIN_LENGTH ? sanitized : "";
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch {
        // fetch失敗・タイムアウトの場合、割り込まないこと自体は不自然ではないので何もしない
        text = "";
      }
    }

    if (!text) {
      // 生成できなかった場合は無理に発言しない（無言のままでも不自然ではないフェーズのため）
      return;
    }

    try {
      await ctx.runMutation(internal.ai.saveChime, { roomId: args.roomId, text });
    } catch (err) {
      console.error("maybeChime: saveChime に失敗しました。", err);
    }
  },
});
