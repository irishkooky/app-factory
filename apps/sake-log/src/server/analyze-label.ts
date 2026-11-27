import { createServerFn } from "@tanstack/react-start";
import { parseLabelAnalysis } from "./parse-label.ts";
import { generateLabelJson } from "./gemini.ts";

const MAX_BASE64_LENGTH = 4_000_000;
const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface AnalyzeLabelInput {
  imageBase64: string;
  mimeType: string;
}

const PROMPT = `あなたは日本酒ラベル画像の読み取り担当です。写真から次の項目を抽出して JSON で返してください。
- 読めない項目は空文字にする。推測で埋めない
- brandName は銘柄名（商品名）
- brewery は酒蔵名
- classification は特定名称（例: 純米大吟醸、本醸造 など）
- region は産地（都道府県や地域名）
- tasteHints は味わいの短いメモ候補（甘口・辛口・フルーティなど、1〜2文）`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    brandName: { type: "STRING" },
    brewery: { type: "STRING" },
    classification: { type: "STRING" },
    region: { type: "STRING" },
    tasteHints: { type: "STRING" },
  },
  required: ["brandName", "brewery", "classification", "region", "tasteHints"],
};

function validateInput(data: AnalyzeLabelInput): AnalyzeLabelInput {
  const input: unknown = data;
  if (!input || typeof input !== "object") throw new Error("不正なリクエストです");
  const { imageBase64, mimeType } = input as Record<string, unknown>;
  if (typeof mimeType !== "string" || !MIME_TYPES.includes(mimeType)) {
    throw new Error("画像の形式が不正です（JPEG / PNG / WebP）");
  }
  if (typeof imageBase64 !== "string" || imageBase64.length === 0)
    throw new Error("画像がありません");
  if (imageBase64.length > MAX_BASE64_LENGTH) throw new Error("画像が大きすぎます");
  if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) throw new Error("画像データが不正です");
  return { imageBase64, mimeType };
}

export const analyzeSakeLabel = createServerFn({ method: "POST" })
  .validator(validateInput)
  .handler(async ({ data }) => {
    const raw = await generateLabelJson(
      [{ inline_data: { mime_type: data.mimeType, data: data.imageBase64 } }, { text: PROMPT }],
      SCHEMA,
    );
    return parseLabelAnalysis(raw);
  });
