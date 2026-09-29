/** Gemini generateContent を JSON 出力で呼ぶ。サーバー関数からだけ使う */

const PRIMARY_MODEL = 'gemini-3.8-flash'
const FALLBACK_MODEL = 'gemini-3.5-flash-lite'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 25_000

type Part = { text: string } | { inline_data: { mime_type: string; data: string } }

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

async function readKey(): Promise<string> {
  const { env } = await import('cloudflare:workers')
  const key = Reflect.get(env, 'GEMINI_API_KEY')
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('サーバーに GEMINI_API_KEY が設定されていません')
  }
  return key
}

async function callModel(model: string, key: string, parts: Part[], schema: object): Promise<unknown> {
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const json = (await res.json().catch(() => ({}))) as GeminiResponse
  if (!res.ok) {
    throw new Error(`Gemini ${model} が HTTP ${res.status} を返しました: ${json.error?.message ?? ''}`.slice(0, 300))
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) throw new Error(`Gemini ${model} の応答が空でした`)
  return JSON.parse(text)
}

/** 主モデルで失敗したら軽量モデルで1回だけやり直す */
export async function generateJson(parts: Part[], schema: object): Promise<unknown> {
  const key = await readKey()
  try {
    return await callModel(PRIMARY_MODEL, key, parts, schema)
  } catch (primaryError) {
    console.error(primaryError)
    return await callModel(FALLBACK_MODEL, key, parts, schema)
  }
}
