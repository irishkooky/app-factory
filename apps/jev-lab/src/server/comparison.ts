import { createGateway, experimental_evaluate, generateText, jsonSchema, Output } from 'ai'
import {
  comparisonModels,
  extractComparisonCost,
  comparisonSchema,
  parseComparisonResponse,
  sharedComparisonQuestions,
  toComparisonPrompt,
  type ComparisonModelId,
  validateComparisonRequest,
} from '../lib/comparison.ts'
import { mapSemanticResult } from '../lib/semantic.ts'

const MAX_BODY_BYTES = 24 * 1024
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

const secret = (env: Pick<Env, 'EVAL_LIMITER'>) => {
  const value = Reflect.get(env, 'AI_GATEWAY_API_KEY')
  return typeof value === 'string' && value ? value : undefined
}

async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new Error('large')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('bad')

  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      throw new Error('large')
    }
    chunks.push(part.value)
  }

  const all = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    all.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(all))
  } catch {
    throw new Error('bad')
  }
}

const limited = (error: unknown) =>
  error instanceof Error && error.name === 'GatewayRateLimitError' ||
  (typeof error === 'object' && error !== null && Reflect.get(error, 'statusCode') === 429)

export async function evaluateComparison(
  request: Request,
  env: Pick<Env, 'EVAL_LIMITER'>,
): Promise<Response> {
  if (request.headers.get('content-type')?.split(';')[0].toLowerCase() !== 'application/json') {
    return json({ error: 'JSON形式で送信してください。' }, 415)
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: 'このリクエスト元は利用できません。' }, 403)
  }
  try {
    const key = request.headers.get('cf-connecting-ip') ?? 'unknown'
    if (!(await env.EVAL_LIMITER.limit({ key })).success) {
      return json({ error: 'しばらく待ってから、もう一度お試しください。' }, 429)
    }
  } catch {
    return json({ error: 'ただいま混み合っています。少ししてからお試しください。' }, 503)
  }

  let input
  try {
    input = validateComparisonRequest(await readBody(request))
  } catch (error) {
    return json({
      error: error instanceof Error && error.message === 'large'
        ? '入力が大きすぎます。'
        : '入力内容を確認してください。',
    }, 400)
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
    const gateway = createGateway({ apiKey })
    let output: unknown
    let usage: unknown
    let providerMetadata: unknown

    if (input.model === 'jev') {
      const result = await experimental_evaluate({
        model: gateway.evaluationModel(comparisonModels[0].providerId),
        state: {
          records: input.records.map(({ id, name, company, category, message }) =>
            ({ id, name, company, category, message })),
        },
        questions: sharedComparisonQuestions(input.records),
        maxRetries: 0,
        abortSignal: controller.signal,
      })
      usage = result.usage
      providerMetadata = result.providerMetadata
      const mapped = mapSemanticResult(result, input.records)
      if (!mapped) throw new Error('invalid')
      output = {
        decisions: mapped.map(({ decision }) => ({
          id: decision.id,
          identity: decision.identity.choice,
          company: decision.company.choice,
          intent: decision.intent.choice,
          detail: decision.detail.choice,
        })),
      }
    } else {
      const prompt = toComparisonPrompt(input.records)
      const result = await generateText({
        model: gateway(comparisonModels.find((model) => model.id === input.model)?.providerId ?? ''),
        instructions: prompt.instructions,
        prompt: prompt.prompt,
        output: Output.object({ schema: jsonSchema(comparisonSchema) }),
        ...(input.model === 'gpt' ? {} : { temperature: 0 }),
        maxOutputTokens: 4096,
        maxRetries: 0,
        abortSignal: controller.signal,
        ...(input.model === 'gpt' || input.model === 'gemini' || input.model === 'qwen'
          ? { reasoning: comparisonModels.find((model) => model.id === input.model)?.reasoning as 'none' | 'low' }
          : {}),
      })
      output = result.output
      usage = result.usage
      providerMetadata = result.providerMetadata
    }

    const outputRecord = typeof output === 'object' && output !== null && !Array.isArray(output)
      ? output as Record<string, unknown>
      : undefined
    const parsed = parseComparisonResponse({
      model: input.model,
      decisions: outputRecord?.decisions,
      elapsedMs: Date.now() - started,
      cost: extractComparisonCost(input.model, usage, providerMetadata),
    }, input.records, input.model)
    if (!parsed) return json({ error: '判断結果を読み取れませんでした。もう一度お試しください。' }, 502)
    return json(parsed)
  } catch (error) {
    const code = limited(error)
      ? 'rate_limited'
      : error instanceof Error && /timeout|abort/i.test(error.message)
        ? 'timeout'
        : 'provider_error'
    console.error(JSON.stringify({ event: 'jev_compare_failed', code }))
    if (code === 'rate_limited') {
      return json({ error: 'Vercel AI Gateway の利用回数制限に達しました。少し待ってから、手動で再試行してください。' }, 429)
    }
    return json({ error: '比較を完了できませんでした。設定と利用状況を確認してから、もう一度お試しください。' }, 502)
  } finally {
    clearTimeout(timer)
    request.signal.removeEventListener('abort', abortFromRequest)
  }
}
