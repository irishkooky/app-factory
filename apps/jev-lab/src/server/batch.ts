import { createGateway, experimental_evaluate } from 'ai'
import { batchScenarioById } from '../data/batch-scenarios'
import { mapBatchResult, toBatchQuestions, validateBatchRequest } from '../lib/batch'

const limit = 64 * 1024
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const read = async (request: Request): Promise<unknown> => {
  if (Number(request.headers.get('content-length')) > limit) throw new Error('large')
  const reader = request.body?.getReader(); if (!reader) throw new Error('bad')
  const chunks: Uint8Array[] = []; let size = 0
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > limit) { await reader.cancel(); throw new Error('large') }; chunks.push(part.value) }
  const output = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder().decode(output)) } catch { throw new Error('bad') }
}
const secret = (env: Pick<Env, 'EVAL_LIMITER'>) => { const value = Reflect.get(env, 'AI_GATEWAY_API_KEY'); return typeof value === 'string' && value ? value : undefined }
const rateLimited = (error: unknown) => error instanceof Error && error.name === 'GatewayRateLimitError' || (typeof error === 'object' && error !== null && Reflect.get(error, 'statusCode') === 429)
const code = (error: unknown) => rateLimited(error) ? 'rate_limited' : error instanceof Error && /timeout|abort/i.test(error.message) ? 'timeout' : 'provider_error'

export async function evaluateBatch(request: Request, env: Pick<Env, 'EVAL_LIMITER'>): Promise<Response> {
  if (request.headers.get('content-type')?.toLowerCase().split(';')[0] !== 'application/json') return json({ error: 'JSON形式で送信してください。' }, 415)
  const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin) return json({ error: 'このリクエスト元は利用できません。' }, 403)
  try { if (!(await env.EVAL_LIMITER.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' })).success) return json({ error: 'しばらく待ってから、もう一度お試しください。' }, 429) } catch { return json({ error: 'ただいま混み合っています。少ししてからお試しください。' }, 503) }
  let input; try { input = validateBatchRequest(await read(request)) } catch (error) { return json({ error: error instanceof Error && error.message === 'large' ? '入力が大きすぎます。' : '入力内容を確認してください。' }, 400) }
  if (!input) return json({ error: '企画と項目内容を確認してください。' }, 400)
  const scenario = batchScenarioById(input.scenarioId); if (!scenario) return json({ error: '企画が見つかりません。' }, 400)
  const apiKey = secret(env); if (!apiKey) return json({ error: 'Vercel AI Gateway の API キーが設定されていません。' }, 503)
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 40_000); const started = Date.now()
  try {
    const result = await experimental_evaluate({ model: createGateway({ apiKey }).evaluationModel('typesafe-ai/jev'), state: { items: input.items }, questions: toBatchQuestions(scenario, input.items), maxRetries: 0, abortSignal: controller.signal })
    return json({ items: mapBatchResult(result, scenario, input.items), elapsedMs: Date.now() - started })
  } catch (error) {
    const failure = code(error); console.error(JSON.stringify({ event: 'jev_batch_failed', code: failure }))
    if (failure === 'rate_limited') return json({ error: 'Vercel AI Gateway の利用回数制限に達しました。少し待ってから、もう一度お試しください。' }, 429)
    return json({ error: '評価を完了できませんでした。Vercel AI Gateway の設定と利用状況を確認してから、もう一度お試しください。' }, 502)
  } finally { clearTimeout(timer) }
}
