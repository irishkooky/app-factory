export type TaskId = string & { readonly __brand: 'TaskId' }
export type Prompt = string & { readonly __brand: 'Prompt' }
export type Duration = number & { readonly __brand: 'Duration' }

export type Resolution = '480P' | '720P'
export type Ratio = '16:9' | '9:16'

export const LIMITS = {
  promptMinChars: 1,
  promptMaxChars: 20_000,
  durationMin: 2,
  durationMax: 10,
  durationDefault: 5,
} as const

export const RESOLUTIONS: readonly Resolution[] = ['480P', '720P']
export const RATIOS: readonly Ratio[] = ['16:9', '9:16']

export const POLL_DEADLINE_MS = 10 * 60_000

export interface GenerateRequest {
  readonly prompt: Prompt
  readonly duration: Duration
  readonly resolution: Resolution
  readonly ratio: Ratio
  readonly audio: boolean
}

export interface GenerateDraft {
  prompt: string
  duration: number
  resolution: Resolution
  ratio: Ratio
  audio: boolean
}

export const DEFAULT_DRAFT: GenerateDraft = {
  prompt: '',
  duration: LIMITS.durationDefault,
  resolution: '480P',
  ratio: '16:9',
  audio: true,
}

export interface JobRef {
  readonly taskId: TaskId
  readonly submittedAt: number
  readonly request: GenerateRequest
}

export type ActiveState =
  | { readonly status: 'queued' }
  | { readonly status: 'running' }

export type JobFailure =
  | { readonly kind: 'rejected'; readonly upstreamCode: string | null }
  | { readonly kind: 'quota' }
  | { readonly kind: 'canceled' }
  | { readonly kind: 'timeout'; readonly waitedMs: number }
  | { readonly kind: 'upstream'; readonly upstreamCode: string | null }
  | { readonly kind: 'misconfigured' }
  | { readonly kind: 'not-found' }

export type SettledState =
  | { readonly status: 'succeeded'; readonly videoUrl: string }
  | { readonly status: 'failed'; readonly failure: JobFailure }
  | { readonly status: 'canceled' }

export type JobState = ActiveState | SettledState

export interface Job<S extends JobState = JobState> {
  readonly ref: JobRef
  readonly state: S
}

export type DraftField = 'prompt' | 'duration' | 'resolution' | 'ratio' | 'audio'

export interface FieldIssue {
  readonly field: DraftField
  readonly messageJa: string
}

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly FieldIssue[] }

export function isActive(state: JobState): state is ActiveState {
  return state.status === 'queued' || state.status === 'running'
}

export function isSettled(state: JobState): state is SettledState {
  return !isActive(state)
}

export function isPastDeadline(submittedAt: number, now: number): boolean {
  return now - submittedAt >= POLL_DEADLINE_MS
}

export function failureMessageJa(failure: JobFailure): string {
  switch (failure.kind) {
    case 'rejected':
      return withUpstreamCode(
        'この内容では動画を作れませんでした。プロンプトを変えてください。',
        failure.upstreamCode,
      )
    case 'quota':
      return '利用上限に達しています。しばらく待つか、残高を確認してください。'
    case 'canceled':
      return '生成はキャンセルされました。'
    case 'timeout':
      return '10分待っても完了しませんでした。もう一度お試しください。'
    case 'upstream':
      return withUpstreamCode(
        '動画サービス側でエラーが起きました。時間をおいて再試行してください。',
        failure.upstreamCode,
      )
    case 'misconfigured':
      return 'サーバーの設定が不足しています。運用者が DASHSCOPE_API_KEY、DASHSCOPE_WORKSPACE_ID、DASHSCOPE_REGION を同じリージョンで設定してください。'
    case 'not-found':
      return 'この生成は見つかりませんでした。もう一度生成してください。'
    default: {
      const _exhaustive: never = failure
      return _exhaustive
    }
  }
}

export function isRetryable(failure: JobFailure): boolean {
  switch (failure.kind) {
    case 'rejected':
    case 'misconfigured':
      return false
    case 'quota':
    case 'canceled':
    case 'timeout':
    case 'upstream':
    case 'not-found':
      return true
    default: {
      const _exhaustive: never = failure
      return _exhaustive
    }
  }
}

export function parsePrompt(raw: unknown): ParseResult<Prompt> {
  if (typeof raw !== 'string') {
    return { ok: false, issues: [{ field: 'prompt', messageJa: 'プロンプトが不正です' }] }
  }
  const prompt = raw.trim()
  if (prompt.length < LIMITS.promptMinChars) {
    return { ok: false, issues: [{ field: 'prompt', messageJa: 'プロンプトを入力してください' }] }
  }
  if (prompt.length > LIMITS.promptMaxChars) {
    return {
      ok: false,
      issues: [{ field: 'prompt', messageJa: `プロンプトは${LIMITS.promptMaxChars}文字以内にしてください` }],
    }
  }
  return { ok: true, value: prompt as Prompt }
}

export function parseDuration(raw: unknown): ParseResult<Duration> {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < LIMITS.durationMin || raw > LIMITS.durationMax) {
    return {
      ok: false,
      issues: [
        {
          field: 'duration',
          messageJa: `長さは${LIMITS.durationMin}〜${LIMITS.durationMax}秒の整数で指定してください`,
        },
      ],
    }
  }
  return { ok: true, value: raw as Duration }
}

export function parseGenerateRequest(raw: unknown): ParseResult<GenerateRequest> {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, issues: [{ field: 'prompt', messageJa: 'リクエストが不正です' }] }
  }
  const record = raw as Record<string, unknown>
  const issues: FieldIssue[] = []

  const prompt = parsePrompt(record.prompt)
  if (!prompt.ok) issues.push(...prompt.issues)

  const duration = parseDuration(record.duration)
  if (!duration.ok) issues.push(...duration.issues)

  if (typeof record.resolution !== 'string' || !isResolution(record.resolution)) {
    issues.push({ field: 'resolution', messageJa: '解像度は480Pまたは720Pを選んでください' })
  }

  if (typeof record.ratio !== 'string' || !isRatio(record.ratio)) {
    issues.push({ field: 'ratio', messageJa: '縦横比は16:9または9:16を選んでください' })
  }

  if (typeof record.audio !== 'boolean') {
    issues.push({ field: 'audio', messageJa: '音声の指定が不正です' })
  }

  if (issues.length > 0 || !prompt.ok || !duration.ok) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    value: {
      prompt: prompt.value,
      duration: duration.value,
      resolution: record.resolution as Resolution,
      ratio: record.ratio as Ratio,
      audio: record.audio as boolean,
    },
  }
}

export function parseTaskId(raw: unknown): TaskId | null {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(raw)) return null
  return raw as TaskId
}

export function parseStoredRef(raw: unknown): JobRef | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (record.version !== 1) return null
  const taskId = parseTaskId(record.taskId)
  if (!taskId) return null
  if (typeof record.submittedAt !== 'number' || !Number.isFinite(record.submittedAt) || record.submittedAt <= 0) {
    return null
  }
  const request = parseGenerateRequest(record.request)
  if (!request.ok) return null
  return { taskId, submittedAt: record.submittedAt, request: request.value }
}

function isResolution(value: string): value is Resolution {
  return (RESOLUTIONS as readonly string[]).includes(value)
}

function isRatio(value: string): value is Ratio {
  return (RATIOS as readonly string[]).includes(value)
}

function withUpstreamCode(message: string, code: string | null): string {
  if (!code) return message
  return `${message}（コード: ${code}）`
}
