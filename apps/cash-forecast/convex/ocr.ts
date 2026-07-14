"use node";
// スクショOCR取り込み（P2）。銀行/カードアプリの入出金明細スクリーンショットをGeminiで
// 構造化抽出する。Gemini呼び出しはこのactionでのみ行う（APIキーをクライアントへ渡さない）。
//
// 堅牢性の要点:
// - Geminiの出力は信用しない。JSON Schemaで型を絞った上、ここでも再検証し、
//   不正な行は例外にせず黙って落として skippedCount に計上する（1行の誤りで全体を失わない）。
// - 銀行スクショはOCR後すぐ削除する（成功・失敗を問わず finally で ctx.storage.delete）。
// - process.env はモジュールトップレベルではなく handler 内でのみ読む。

import { action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { internal } from "./_generated/api";

// Convexのサーバーランタイム(Node)はprocess.envで環境変数を公開する。
declare const process: { env: Record<string, string | undefined> };

// 新しいFlash系モデルがGAになったらここだけ差し替える。
// 注意: 古いモデルは新規Googleプロジェクトでは404になることがある
// （gemini-2.5-flash は2026年時点で新規ユーザーに提供終了済み）。
const GEMINI_MODEL = "gemini-3.5-flash";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_AMOUNT = 1_000_000_000;
const MAX_NAME_LENGTH = 40;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ExtractedRow = {
  date: string;
  name: string;
  kind: "income" | "expense";
  amount: number;
  balanceAfter?: number;
};

function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

// "YYYY-MM-DD" 形式かつ実在する日付か（例: 2026-02-30 のような無効日を弾く）。
function isValidCalendarDate(date: string): boolean {
  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

// Gemini呼び出しの失敗を、ユーザーに意味のある日本語メッセージへ分類する。
// Convex本番デプロイメントは通常の Error のメッセージをクライアントに渡さず "Server Error" に
// 置き換えてしまうため、ここで ConvexError（.data がそのままクライアントに届く）に変換する。
// 元エラーは呼び出し側で console.error に残す。
function classifyGeminiError(err: unknown): ConvexError<string> {
  const message = err instanceof Error ? err.message : String(err);
  if (/RESOURCE_EXHAUSTED/.test(message) || /\b429\b/.test(message)) {
    return new ConvexError(
      "Gemini APIの利用枠を使い切っています。Google AI Studioの請求設定を確認してください",
    );
  }
  // 裸の400はペイロード過大等キーと無関係な理由でも返るため、キー無効とは断定しない
  if (/API_KEY_INVALID/.test(message) || /\b403\b/.test(message)) {
    return new ConvexError("Gemini APIキーが無効です。管理者向け: GEMINI_API_KEY を確認してください");
  }
  if (/NOT_FOUND/.test(message) || /\b404\b/.test(message)) {
    return new ConvexError(
      "OCRモデルが利用できません。管理者向け: convex/ocr.ts の GEMINI_MODEL を現行モデルに更新してください",
    );
  }
  return new ConvexError("明細の読み取りに失敗しました。時間をおいて再度お試しください");
}

// Geminiの出力（信頼できない）を1行ずつ再検証する。不正なら null を返し、呼び出し側で落とす。
function normalizeRow(raw: unknown, today: string): ExtractedRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { date, name, kind, amount, balanceAfter } = raw as Record<string, unknown>;

  if (typeof date !== "string" || !DATE_RE.test(date) || !isValidCalendarDate(date) || date > today) {
    return null;
  }
  if (typeof name !== "string") return null;
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return null;
  const clippedName = trimmedName.length > MAX_NAME_LENGTH ? trimmedName.slice(0, MAX_NAME_LENGTH) : trimmedName;

  if (kind !== "income" && kind !== "expense") return null;

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    return null;
  }

  const normalizedBalanceAfter =
    typeof balanceAfter === "number" && Number.isInteger(balanceAfter) ? balanceAfter : undefined;

  return {
    date,
    name: clippedName,
    kind,
    amount,
    balanceAfter: normalizedBalanceAfter,
  };
}

export const extractStatement = action({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { storageIds }): Promise<{ rows: ExtractedRow[]; skippedCount: number }> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new ConvexError("ログインが必要です");
      }
      await ctx.runQuery(internal.billing.assertProForAction, { userId: identity.subject });

      if (storageIds.length === 0 || storageIds.length > MAX_IMAGES) {
        throw new ConvexError("一度に取り込めるのは5枚までです");
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new ConvexError("OCR機能が未設定です（管理者向け: GEMINI_API_KEY を設定してください）");
      }

      const imageParts: { inlineData: { mimeType: string; data: string } }[] = [];
      for (const storageId of storageIds) {
        const blob = await ctx.storage.get(storageId);
        if (!blob) {
          throw new ConvexError("画像の取得に失敗しました");
        }
        if (!blob.type.startsWith("image/")) {
          throw new ConvexError("画像ファイルのみ対応しています");
        }
        if (blob.size > MAX_IMAGE_BYTES) {
          throw new ConvexError("画像は1枚あたり4MBまでにしてください");
        }
        const buffer = await blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        imageParts.push({ inlineData: { mimeType: blob.type, data: base64 } });
      }

      const today = todayJST();
      const prompt = `これは日本の銀行/カードアプリの入出金明細のスクリーンショットです。すべての取引行を抽出してください。
- 日付は YYYY-MM-DD 形式にしてください。年が表示されていない場合は「${today} 以前で最も近い年」と解釈してください。
- 金額はカンマ・円記号を除いた正の整数にしてください。入金は income、出金は expense としてください。
- 残高列が表示されていれば balanceAfter（その行の取引後残高）に入れてください。無ければ省略してください。
- 複数枚のスクリーンショットはスクロールにより重複する行を含むことがあります。同一の取引は1回だけ出力してください。
- UI要素・広告・合計行・見出しは無視してください。判読できない行は含めないでください。`;

      const ai = new GoogleGenAI({ apiKey });
      let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }, ...imageParts],
            },
          ],
          config: {
            temperature: 0,
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              properties: {
                rows: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", description: "YYYY-MM-DD" },
                      name: { type: "string" },
                      kind: { type: "string", enum: ["income", "expense"] },
                      amount: { type: "integer" },
                      balanceAfter: { type: "integer" },
                    },
                    required: ["date", "name", "kind", "amount"],
                  },
                },
              },
              required: ["rows"],
            },
          },
        });
      } catch (err) {
        // 元エラー（例: 429 RESOURCE_EXHAUSTED）はConvexログに残しつつ、
        // ユーザーには分類済みの日本語メッセージだけを返す。
        console.error("ocr: Gemini API呼び出しに失敗しました", err);
        throw classifyGeminiError(err);
      }

      const text = response.text;
      if (!text) {
        throw new ConvexError("OCR結果を取得できませんでした");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new ConvexError("OCR結果の解析に失敗しました");
      }

      const rawRows =
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as { rows?: unknown }).rows)
          ? (parsed as { rows: unknown[] }).rows
          : [];

      let skippedCount = 0;
      const rows: ExtractedRow[] = [];
      for (const raw of rawRows) {
        const normalized = normalizeRow(raw, today);
        if (normalized) {
          rows.push(normalized);
        } else {
          skippedCount += 1;
        }
      }

      rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      return { rows, skippedCount };
    } finally {
      // 銀行スクショを残さない: 成功・失敗を問わず、受け取った storageId は必ず削除する。
      // 1件の削除失敗（既に削除済み等）で残りが削除されずに終わらないよう、個別にtry/catchする。
      for (const storageId of storageIds) {
        try {
          await ctx.storage.delete(storageId);
        } catch (err) {
          console.error(`ocr: storageId ${storageId} の削除に失敗しました`, err);
        }
      }
    }
  },
});
