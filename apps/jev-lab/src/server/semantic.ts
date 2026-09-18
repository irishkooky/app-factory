import { createGateway, experimental_evaluate } from 'ai'
import { mapSemanticResult, toSemanticQuestions, validateSemanticRequest } from '../lib/semantic.ts'

const MAX_BODY_BYTES = 24 * 1024
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

const readBody = async (request: Request): Promise<unknown> => {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new Error('too-large')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('bad-request')
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      throw new Error('too-large')
    }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try { return JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new Error('bad-request') }
}

const secret = (env: Pick<Env, 'EVAL_LIMITER'>) => {
  const value = Reflect.get(env, 'AI_GATEWAY_API_KEY')
  return typeof value === 'string' && value ? value : undefined
}

const rateLimited = (error: unknown) =>
  error instanceof Error && error.name === 'GatewayRateLimitError' ||
  (typeof error === 'object' && error !== null && Reflect.get(error, 'statusCode') === 429)

const failureCode = (error: unknown) => {
  if (rateLimited(error)) return 'rate_limited'
  if (error instanceof Error && /timeout|abort/i.test(error.message)) return 'timeout'
  return 'provider_error'
}

export async function evaluateSemantic(request: Request, env: Pick<Env, 'EVAL_LIMITER'>): Promise<Response> {
  if (request.headers.get('content-type')?.toLowerCase().split(';')[0] !== 'application/json') return json({ error: 'JSON形式で送信してください。' }, 415)
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'このリクエスト元は利用できません。' }, 403)
  try {
    const key = request.headers.get('cf-connecting-ip') ?? 'unknown'
    if (!(await env.EVAL_LIMITER.limit({ key })).success) return json({ error: 'しばらく待ってから、もう一度お試しください。' }, 429)
  } catch {
    return json({ error: 'ただいま混み合っています。少ししてからお試しください。' }, 503)
  }

  let input
  try { input = validateSemanticRequest(await readBody(request)) } catch (error) {
    return json({ error: error instanceof Error && error.message === 'too-large' ? '入力が大きすぎます。' : '入力内容を確認してください。' }, 400)
  }
  if (!input) return json({ error: '入力内容を確認してください。' }, 400)
  const apiKey = secret(env)
  if (!apiKey) return json({ error: 'Vercel AI Gateway の API キーが設定されていません。' }, 503)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 40_000)
  const abortFromRequest = () => controller.abort()
  request.signal.addEventListener('abort', abortFromRequest, { once: true })
  if (request.signal.aborted) controller.abort()
  const started = Date.now()
  try {
    controller.signal.throwIfAborted()
    const result = await experimental_evaluate({
      model: createGateway({ apiKey }).evaluationModel('typesafe-ai/jev'),
      state: { records: input.records.map(({ id, name, company, category, message }) => ({ id, name, company, category, message })) },
      questions: toSemanticQuestions(input.records),
      maxRetries: 0,
      abortSignal: controller.signal,
    })
    const results = mapSemanticResult(result, input.records)
    if (!results) return json({ error: '判断結果を読み取れませんでした。もう一度お試しください。' }, 502)
    return json({ results, elapsedMs: Date.now() - started })
  } catch (error) {
    const code = failureCode(error)
    console.error(JSON.stringify({ event: 'jev_semantic_failed', code }))
    if (code === 'rate_limited') return json({ error: 'Vercel AI Gateway の利用回数制限に達しました。少し待ってから、手動で再試行してください。' }, 429)
    return json({ error: '意味の判断を完了できませんでした。設定と利用状況を確認してから、もう一度お試しください。' }, 502)
  } finally {
    clearTimeout(timer)
    request.signal.removeEventListener('abort', abortFromRequest)
  }
}
