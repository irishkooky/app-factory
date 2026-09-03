import { createServerFn } from '@tanstack/react-start'
import Anthropic from '@anthropic-ai/sdk'
import { JUDGE_MODEL, getModel, getProvider } from '../data/models'
import { calcCostUsd } from '../lib/cost'

export type JudgeInput = {
  taskTitle: string
  rubric: string
  system: string
  input: string
  outputs: { modelId: string; text: string }[]
}

export type JudgeScore = {
  modelId: string
  score: number // 1-5
  reason: string
}

export type JudgeResult = {
  ok: boolean
  scores: JudgeScore[]
  error?: string
  keyMissing?: boolean
  latencyMs: number
  costUsd: number
}

const MAX_TOKENS = 2048
const MIN_OUTPUTS = 2

function labelFor(index: number): string {
  // A, B, C, ... Z, AA, AB, ... (26件を超える想定は無いが念のため)
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** 非数値は 0(失敗扱い)、数値は 1〜5 にクランプする */
function clampScore(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(5, Math.max(1, Math.round(value)))
}

function extractJsonText(text: string): string | undefined {
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  if (fenceMatch) return fenceMatch[1].trim()
  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart >= 0 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1)
  }
  return undefined
}

function parseJudgeJson(text: string): { label: string; score: number; reason: string }[] | undefined {
  const candidates = [text, extractJsonText(text)].filter((v): v is string => typeof v === 'string')
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate)
      if (!parsed || typeof parsed !== 'object') continue
      const scores = (parsed as Record<string, unknown>).scores
      if (!Array.isArray(scores)) continue
      const result = scores
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return undefined
          const e = entry as Record<string, unknown>
          if (typeof e.label !== 'string') return undefined
          return {
            label: e.label,
            score: clampScore(e.score),
            reason: typeof e.reason === 'string' ? e.reason : '',
          }
        })
        .filter((v): v is { label: string; score: number; reason: string } => v !== undefined)
      if (result.length > 0) return result
    } catch {
      // 次の候補を試す
    }
  }
  return undefined
}

function validateJudgeInput(data: JudgeInput): JudgeInput {
  const input: unknown = data
  if (!input || typeof input !== 'object') {
    throw new Error('不正なリクエストです')
  }
  const record = input as Record<string, unknown>
  if (typeof record.taskTitle !== 'string' || typeof record.rubric !== 'string') {
    throw new Error('taskTitle / rubric が不正です')
  }
  if (typeof record.system !== 'string' || typeof record.input !== 'string') {
    throw new Error('system / input が不正です')
  }
  if (!Array.isArray(record.outputs)) {
    throw new Error('outputs が不正です')
  }
  const outputs = record.outputs
    .map((o) => {
      if (!o || typeof o !== 'object') return undefined
      const e = o as Record<string, unknown>
      if (typeof e.modelId !== 'string' || typeof e.text !== 'string') return undefined
      return { modelId: e.modelId, text: e.text }
    })
    .filter((v): v is { modelId: string; text: string } => v !== undefined)

  return {
    taskTitle: record.taskTitle,
    rubric: record.rubric,
    system: record.system,
    input: record.input,
    outputs,
  }
}

function emptyJudgeResult(overrides: Partial<JudgeResult>): JudgeResult {
  return {
    ok: false,
    scores: [],
    latencyMs: 0,
    costUsd: 0,
    ...overrides,
  }
}

export const judgeOutputs = createServerFn({ method: 'POST' })
  .validator(validateJudgeInput)
  .handler(async ({ data }): Promise<JudgeResult> => {
    if (data.outputs.length < MIN_OUTPUTS) {
      return emptyJudgeResult({ error: '採点には2件以上の出力が必要です' })
    }

    const judgeModel = getModel(JUDGE_MODEL)
    if (!judgeModel) {
      return emptyJudgeResult({ error: '採点モデルの定義が見つかりません' })
    }
    const provider = getProvider(judgeModel.provider)

    let key: unknown
    let workspaceId: unknown
    try {
      const { env } = await import('cloudflare:workers')
      key = Reflect.get(env, provider.envKey)
      workspaceId = Reflect.get(env, 'ANTHROPIC_WORKSPACE_ID')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return emptyJudgeResult({ error: `キー取得でエラーが発生しました: ${message.slice(0, 200)}` })
    }
    if (typeof key !== 'string' || key.trim().length === 0) {
      return emptyJudgeResult({ error: `キー未設定です(${provider.envKey})`, keyMissing: true })
    }

    // モデル名を伏せてシャッフルし、A/B/C… のラベルを割り当てる
    const shuffled = shuffle(data.outputs)
    const labeled = shuffled.map((o, i) => ({ label: labelFor(i), modelId: o.modelId, text: o.text }))

    const candidatesText = labeled
      .map((c) => `## 候補 ${c.label}\n${c.text}`)
      .join('\n\n')

    const judgeSystem =
      'あなたは公平な審査員です。タスク・入力・評価基準・候補回答を読み、各候補を1〜5点で採点し、理由を日本語1文で述べてください。' +
      '出力はJSONのみとし、説明文やコードフェンスは含めないでください。形式: {"scores":[{"label":"A","score":4,"reason":"..."}]}'

    const judgeUserContent =
      `# タスク\n${data.taskTitle}\n\n` +
      `# 評価基準\n${data.rubric}\n\n` +
      `# タスクのsystemプロンプト\n${data.system}\n\n` +
      `# 入力\n${data.input}\n\n` +
      `# 候補回答(モデル名は伏せています)\n${candidatesText}`

    const started = performance.now()
    try {
      const client = new Anthropic({
        apiKey: key,
        defaultHeaders:
          typeof workspaceId === 'string' && workspaceId.trim().length > 0
            ? { 'anthropic-workspace-id': workspaceId.trim() }
            : {},
      })
      const response = await client.messages.create({
        model: judgeModel.apiModel,
        max_tokens: MAX_TOKENS,
        system: judgeSystem,
        messages: [{ role: 'user', content: judgeUserContent }],
      })
      const latencyMs = performance.now() - started

      const text = response.content
        .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
        .map((block) => block.text)
        .join('')

      const inputTokens = response.usage?.input_tokens ?? 0
      const outputTokens = response.usage?.output_tokens ?? 0
      const costUsd = calcCostUsd(inputTokens, outputTokens, judgeModel)

      const parsed = parseJudgeJson(text)
      if (!parsed) {
        return emptyJudgeResult({ latencyMs, costUsd, error: '採点結果の解析に失敗しました' })
      }

      const labelToModelId = new Map(labeled.map((c) => [c.label, c.modelId]))
      // 採点結果に同一ラベルの重複があっても1ラベル1件に正規化する(最初の出現を採用)
      const usedLabels = new Set<string>()
      const scores: JudgeScore[] = parsed
        .map((s) => {
          if (usedLabels.has(s.label)) return undefined
          const modelId = labelToModelId.get(s.label)
          if (!modelId) return undefined
          usedLabels.add(s.label)
          return { modelId, score: s.score, reason: s.reason }
        })
        .filter((v): v is JudgeScore => v !== undefined)

      if (scores.length === 0) {
        return emptyJudgeResult({ latencyMs, costUsd, error: '採点結果を候補に対応付けられませんでした' })
      }

      return { ok: true, scores, latencyMs, costUsd }
    } catch (err) {
      const latencyMs = performance.now() - started
      if (err instanceof Anthropic.APIError) {
        // err.message には既にステータスが含まれているため、HTTPステータスを重複して付与しない
        return emptyJudgeResult({ latencyMs, error: err.message.slice(0, 200) })
      }
      const message = err instanceof Error ? err.message : String(err)
      return emptyJudgeResult({ latencyMs, error: message.slice(0, 200) })
    }
  })
