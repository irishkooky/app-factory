export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 30_000;

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

export async function readGeminiApiKey(): Promise<string | null> {
  const { env } = await import("cloudflare:workers");
  const key = Reflect.get(env, "GEMINI_API_KEY");
  if (typeof key !== "string" || key.trim() === "") return null;
  return key.trim();
}

export async function readGeminiModel(): Promise<string> {
  const { env } = await import("cloudflare:workers");
  const model = Reflect.get(env, "GEMINI_MODEL");
  if (typeof model === "string" && model.trim()) return model.trim();
  return DEFAULT_GEMINI_MODEL;
}

async function callModel(
  model: string,
  key: string,
  parts: Part[],
  schema: object,
): Promise<unknown> {
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    throw new Error(
      `Gemini が HTTP ${res.status} を返しました: ${json.error?.message ?? ""}`.slice(0, 300),
    );
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini の応答が空でした");
  return JSON.parse(text);
}

export async function generateLabelJson(parts: Part[], schema: object): Promise<unknown> {
  const key = await readGeminiApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY が未設定のため解析できません");
  }
  const model = await readGeminiModel();
  return callModel(model, key, parts, schema);
}
