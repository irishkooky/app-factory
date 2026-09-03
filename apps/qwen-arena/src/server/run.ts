import { createServerFn } from '@tanstack/react-start'
import Anthropic from '@anthropic-ai/sdk'
import { getModel, getProvider, type ProviderId } from '../data/models'
import { calcCostUsd } from '../lib/cost'

export type RunInput = {
  modelId: string
  system: string
  input: string
  maxTokens?: number
}

export type RunResult = {
  modelId: string
  ok: boolean
  text: string // 失敗時は ''
  inputTokens: number // usage が無ければ 0
  outputTokens: number
  latencyMs: number
  costUsd: number
  error?: string // 失敗理由(ユーザー向け短文。HTTPステータス+本文先頭200字)
  keyMissing?: boolean // キー未設定なら true(error も入れる)
  usageMissing?: boolean // レスポンスにusageが無くトークン数・コストが計測できなかった場合 true
}

const MIN_MAX_TOKENS = 64
const MAX_MAX_TOKENS = 4096
const TEXT_TOTAL_LIMIT = 20_000
const FETCH_TIMEOUT_MS = 90_000
const ERROR_BODY_PREVIEW_LENGTH = 200

function clampMaxTokens(value: number | undefined): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 1024
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, n))
}

function emptyResult(modelId: string, overrides: Partial<RunResult>): RunResult {
  return {
    modelId,
    ok: false,
    text: '',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    costUsd: 0,
    ...overrides,
  }
}

function truncateErrorBody(body: string): string {
  return body.length > ERROR_BODY_PREVIEW_LENGTH ? `${body.slice(0, ERROR_BODY_PREVIEW_LENGTH)}…` : body
}

/** OpenAI互換の chat/completions レスポンスから本文を取り出す。content が配列(パーツ)で返る実装もあるため両対応する */
function extractOpenAiCompatText(message: unknown): string {
  if (!message || typeof message !== 'object') return ''
  const content = (message as Record<string, unknown>).content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string') {
          return (part as Record<string, unknown>).text as string
        }
        return ''
      })
      .join('')
  }
  return ''
}

async function readKey(envKey: string): Promise<string | undefined> {
  const { env } = await import('cloudflare:workers')
  const value = Reflect.get(env, envKey)
  if (typeof value !== 'string' || value.trim().length === 0) return undefined
  return value
}

async function runOpenAiCompat(
  modelId: string,
  baseUrl: string,
  key: string,
  apiModel: string,
  system: string,
  input: string,
  maxTokens: number,
  extraBody: Record<string, unknown> | undefined,
  maxTokensParam: 'max_tokens' | 'max_completion_tokens',
): Promise<RunResult> {
  const model = getModel(modelId)
  if (!model) return emptyResult(modelId, { error: '未知のモデルです' })

  const started = performance.now()
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: input },
        ],
        [maxTokensParam]: maxTokens,
        ...extraBody,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    const latencyMs = performance.now() - started

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      return emptyResult(modelId, {
        latencyMs,
        error: `HTTP ${res.status}: ${truncateErrorBody(bodyText)}`,
      })
    }

    const json: unknown = await res.json().catch(() => null)
    if (!json || typeof json !== 'object') {
      return emptyResult(modelId, { latencyMs, error: 'レスポンスの解析に失敗しました' })
    }
    const record = json as Record<string, unknown>
    const choices = Array.isArray(record.choices) ? record.choices : []
    const firstChoice = choices.length > 0 ? (choices[0] as Record<string, unknown>) : undefined
    const text = extractOpenAiCompatText(firstChoice?.message)

    const usage = record.usage && typeof record.usage === 'object' ? (record.usage as Record<string, unknown>) : undefined
    const promptTokensRaw = usage?.prompt_tokens
    const completionTokensRaw = usage?.completion_tokens
    const usageMissing = typeof promptTokensRaw !== 'number' || typeof completionTokensRaw !== 'number'
    const inputTokens = typeof promptTokensRaw === 'number' ? promptTokensRaw : 0
    const outputTokens = typeof completionTokensRaw === 'number' ? completionTokensRaw : 0

    return {
      modelId,
      ok: true,
      text,
      inputTokens,
      outputTokens,
      latencyMs,
      costUsd: calcCostUsd(inputTokens, outputTokens, model),
      usageMissing,
    }
  } catch (err) {
    const latencyMs = performance.now() - started
    const message = err instanceof Error ? err.message : String(err)
    return emptyResult(modelId, { latencyMs, error: truncateErrorBody(message) })
  }
}

async function runAnthropic(
  modelId: string,
  key: string,
  apiModel: string,
  system: string,
  input: string,
  maxTokens: number,
): Promise<RunResult> {
  const model = getModel(modelId)
  if (!model) return emptyResult(modelId, { error: '未知のモデルです' })

  const started = performance.now()
  try {
    // Anthropic Console の identity-linked API key は anthropic-workspace-id ヘッダーが必須(無ければ付けない)
    const workspaceId = await readKey('ANTHROPIC_WORKSPACE_ID').catch(() => undefined)
    const client = new Anthropic({
      apiKey: key,
      defaultHeaders: workspaceId ? { 'anthropic-workspace-id': workspaceId } : {},
    })
    const response = await client.messages.create({
      model: apiModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: input }],
    })
    const latencyMs = performance.now() - started

    if (response.stop_reason === 'refusal') {
      return emptyResult(modelId, { latencyMs, error: 'refusal' })
    }

    const text = response.content
      .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
      .map((block) => block.text)
      .join('')

    const usageMissing = typeof response.usage?.input_tokens !== 'number' || typeof response.usage?.output_tokens !== 'number'
    const inputTokens = response.usage?.input_tokens ?? 0
    const outputTokens = response.usage?.output_tokens ?? 0

    return {
      modelId,
      ok: true,
      text,
      inputTokens,
      outputTokens,
      latencyMs,
      costUsd: calcCostUsd(inputTokens, outputTokens, model),
      usageMissing,
    }
  } catch (err) {
    const latencyMs = performance.now() - started
    if (err instanceof Anthropic.APIError) {
      // err.message には既にステータスが含まれているため、HTTPステータスを重複して付与しない
      return emptyResult(modelId, { latencyMs, error: truncateErrorBody(err.message) })
    }
    const message = err instanceof Error ? err.message : String(err)
    return emptyResult(modelId, { latencyMs, error: truncateErrorBody(message) })
  }
}

function validateRunInput(data: RunInput): RunInput {
  const input: unknown = data
  if (!input || typeof input !== 'object') {
    throw new Error('不正なリクエストです')
  }
  const record = input as Record<string, unknown>
  if (typeof record.modelId !== 'string' || record.modelId.length === 0) {
    throw new Error('modelId が不正です')
  }
  if (typeof record.system !== 'string' || typeof record.input !== 'string') {
    throw new Error('system / input が不正です')
  }
  const maxTokens = typeof record.maxTokens === 'number' ? record.maxTokens : undefined

  return {
    modelId: record.modelId,
    system: record.system,
    input: record.input,
    maxTokens,
  }
}

export const runModel = createServerFn({ method: 'POST' })
  .validator(validateRunInput)
  .handler(async ({ data }): Promise<RunResult> => {
    const model = getModel(data.modelId)
    if (!model) {
      return emptyResult(data.modelId, { error: '未知のモデルです' })
    }

    if ((data.system.length + data.input.length) > TEXT_TOTAL_LIMIT) {
      return emptyResult(data.modelId, { error: `入力が長すぎます(system+inputは${TEXT_TOTAL_LIMIT}文字まで)` })
    }

    const provider = getProvider(model.provider)

    let key: string | undefined
    try {
      key = await readKey(provider.envKey)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return emptyResult(data.modelId, { error: `キー取得でエラーが発生しました: ${truncateErrorBody(message)}` })
    }

    if (!key) {
      return emptyResult(data.modelId, {
        error: `キー未設定です(${provider.envKey})`,
        keyMissing: true,
      })
    }

    const maxTokens = clampMaxTokens(data.maxTokens)

    if (provider.kind === 'anthropic') {
      return runAnthropic(data.modelId, key, model.apiModel, data.system, data.input, maxTokens)
    }

    if (!provider.baseUrl) {
      return emptyResult(data.modelId, { error: 'baseUrl が未設定です' })
    }
    let baseUrl = provider.baseUrl
    if (provider.baseUrlEnvKey) {
      try {
        const override = await readKey(provider.baseUrlEnvKey)
        if (override) baseUrl = override.replace(/\/+$/, '')
      } catch {
        // 上書きが読めなければ既定の baseUrl を使う
      }
    }

    return runOpenAiCompat(
      data.modelId,
      baseUrl,
      key,
      model.apiModel,
      data.system,
      data.input,
      maxTokens,
      model.extraBody,
      provider.maxTokensParam ?? 'max_tokens',
    )
  })

export const getAvailability = createServerFn({ method: 'GET' }).handler(async (): Promise<Record<ProviderId, boolean>> => {
  const { PROVIDERS } = await import('../data/models')
  const entries = await Promise.all(
    PROVIDERS.map(async (provider) => {
      try {
        const key = await readKey(provider.envKey)
        return [provider.id, Boolean(key)] as const
      } catch {
        // キー取得に失敗した場合は「未設定」として扱う(UIを壊さない)
        return [provider.id, false] as const
      }
    }),
  )
  return Object.fromEntries(entries) as Record<ProviderId, boolean>
})
