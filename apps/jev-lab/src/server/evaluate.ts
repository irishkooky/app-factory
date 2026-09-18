import { createGateway, experimental_evaluate } from 'ai'
import { scenarioById } from '../data/scenarios'
import { adaptVercelEvaluation, toVercelQuestions } from '../lib/vercel-jev'

type RequestData = { scenarioId: string; text: string };
const MAX_BODY_BYTES = 32 * 1024;
const isGatewayRateLimited = (error: unknown) => {
  if (error instanceof Error && error.name === 'GatewayRateLimitError') return true
  if (!error || typeof error !== 'object') return false
  return Reflect.get(error, 'statusCode') === 429
}
const evaluationFailureCode = (error: unknown) => {
  if (isGatewayRateLimited(error)) return "rate_limited";
  if (!(error instanceof Error)) return "provider_error";
  const message = error.message.toLowerCase();
  if (/auth|permission|forbidden|unauthori[sz]ed/.test(message))
    return "auth_error";
  if (/credit|balance|payment|billing|quota/.test(message))
    return "insufficient_credits";
  if (/gateway/.test(message)) return "gateway_error";
  if (/model|not found/.test(message)) return "model_error";
  if (/timeout|timed out/.test(message)) return "timeout";
  return "provider_error";
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const readBody = async (request: Request): Promise<unknown> => {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    throw new Error("too-large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("bad-request");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("too-large");
    }
    chunks.push(part.value);
  }
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(combined));
  } catch {
    throw new Error("bad-request");
  }
};
const requestData = (value: unknown): RequestData | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.scenarioId !== "string" ||
    typeof candidate.text !== "string"
  )
    return undefined;
  const text = candidate.text.trim();
  return text && text.length <= 4000
    ? { scenarioId: candidate.scenarioId, text }
    : undefined;
};

const runtimeSecret = (env: Pick<Env, 'EVAL_LIMITER'>, name: string) => {
  const value = Reflect.get(env, name)
  return typeof value === 'string' && value ? value : undefined
}

export async function evaluate(
  request: Request,
  env: Pick<Env, 'EVAL_LIMITER'>,
): Promise<Response> {
  if (
    request.headers.get("content-type")?.toLowerCase().split(";")[0] !==
    "application/json"
  )
    return json({ error: "JSON形式で送信してください。" }, 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "このリクエスト元は利用できません。" }, 403);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    if (!(await env.EVAL_LIMITER.limit({ key: ip })).success)
      return json(
        { error: "しばらく待ってから、もう一度お試しください。" },
        429,
      );
  } catch {
    return json(
      { error: "ただいま混み合っています。少ししてからお試しください。" },
      503,
    );
  }
  let data: RequestData | undefined;
  try {
    data = requestData(await readBody(request));
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error && error.message === "too-large"
            ? "入力が大きすぎます。"
            : "入力内容を確認してください。",
      },
      400,
    );
  }
  if (!data) return json({ error: "企画と入力内容を確認してください。" }, 400);
  const scenario = scenarioById(data.scenarioId);
  if (!scenario) return json({ error: "企画が見つかりません。" }, 400);
  const apiKey = runtimeSecret(env, 'AI_GATEWAY_API_KEY')
  if (!apiKey) {
    return json(
      { error: 'Vercel AI Gateway の API キーが設定されていません。' },
      503,
    )
  }
  const started = Date.now();
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 40_000)
    let raw: unknown
    try {
      const gateway = createGateway({ apiKey })
      raw = await experimental_evaluate({
        model: gateway.evaluationModel('typesafe-ai/jev'),
        state: data.text,
        questions: toVercelQuestions(scenario),
        maxRetries: 0,
        abortSignal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
    const result = adaptVercelEvaluation(raw, scenario);
    if (!result)
      return json(
        { error: "評価結果を読み取れませんでした。もう一度お試しください。" },
        502,
      );
    return json({ result, elapsedMs: Date.now() - started });
  } catch (error) {
    const code = evaluationFailureCode(error)
    console.error(
      JSON.stringify({
        event: "jev_evaluation_failed",
        code,
      }),
    );
    if (code === 'rate_limited') {
      return json(
        { error: 'Vercel AI Gateway の利用回数制限に達しました。少し待ってから、もう一度お試しください。' },
        429,
      )
    }
    return json(
      {
        error:
          "評価を完了できませんでした。Vercel AI Gateway の設定と利用状況を確認してから、もう一度お試しください。",
      },
      502,
    );
  }
}
