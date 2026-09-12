import { createServerFn } from '@tanstack/react-start'
import {
  failureMessageJa,
  parseGenerateRequest,
  parseTaskId,
  type GenerateRequest,
  type JobFailure,
  type JobState,
  type TaskId,
} from './job'

const WAN_MODEL = 'wan3.0-video'
const UPSTREAM_TIMEOUT_MS = 15_000

const WAN_REGIONS = [
  'ap-southeast-1',
  'cn-beijing',
  'us-east-1',
  'ap-northeast-1',
  'eu-central-1',
  'cn-hongkong',
] as const

type WanRegion = (typeof WAN_REGIONS)[number]

interface WanConfig {
  readonly apiKey: string
  readonly workspaceId: string
  readonly region: WanRegion
}

interface DashScopeEnv {
  DASHSCOPE_API_KEY?: string
  DASHSCOPE_WORKSPACE_ID?: string
  DASHSCOPE_REGION?: string
}

function readEnvString(env: object, key: keyof DashScopeEnv): string | undefined {
  const value = Reflect.get(env, key)
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isWanRegion(value: string): value is WanRegion {
  return (WAN_REGIONS as readonly string[]).includes(value)
}

async function readWanConfig(): Promise<WanConfig | null> {
  const { env } = await import('cloudflare:workers')
  const apiKey = readEnvString(env, 'DASHSCOPE_API_KEY')
  const workspaceId = readEnvString(env, 'DASHSCOPE_WORKSPACE_ID')
  const region = readEnvString(env, 'DASHSCOPE_REGION') ?? 'ap-southeast-1'
  if (!apiKey || !workspaceId || !isWanRegion(region)) return null
  return { apiKey, workspaceId, region }
}

function baseUrl(cfg: WanConfig): string {
  return `https://${cfg.workspaceId}.${cfg.region}.maas.aliyuncs.com`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function parseHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    return value
  } catch {
    return null
  }
}

function failureFromUpstreamCode(code: string | null): JobFailure {
  const normalized = (code ?? '').toLowerCase()
  if (
    normalized.includes('invalidparameter') ||
    normalized.includes('datainspection') ||
    normalized.includes('inappropriate') ||
    normalized.includes('ipinfringement')
  ) {
    return { kind: 'rejected', upstreamCode: code }
  }
  if (
    normalized.includes('throttl') ||
    normalized.includes('quota') ||
    normalized.includes('insufficient') ||
    normalized.includes('arrearage') ||
    normalized.includes('balance')
  ) {
    return { kind: 'quota' }
  }
  return { kind: 'upstream', upstreamCode: code }
}

export function parseTaskPayload(json: unknown): JobState {
  const root = asRecord(json)
  if (!root) {
    return { status: 'failed', failure: { kind: 'upstream', upstreamCode: null } }
  }

  const output = asRecord(root.output)
  const taskStatus = readString(output?.task_status) ?? readString(root.task_status)

  if (taskStatus === 'PENDING') return { status: 'queued' }
  if (taskStatus === 'RUNNING' || taskStatus === 'UNKNOWN') return { status: 'running' }
  if (taskStatus === 'CANCELED') return { status: 'canceled' }

  if (taskStatus === 'SUCCEEDED') {
    const videoUrl = parseHttpsUrl(output?.video_url)
    if (!videoUrl) {
      return { status: 'failed', failure: { kind: 'upstream', upstreamCode: 'MissingVideoUrl' } }
    }
    return { status: 'succeeded', videoUrl }
  }

  if (taskStatus === 'FAILED') {
    const code = readString(output?.code) ?? readString(root.code)
    return { status: 'failed', failure: failureFromUpstreamCode(code) }
  }

  if (taskStatus == null) {
    const code = readString(root.code) ?? readString(output?.code)
    if (code) return { status: 'failed', failure: failureFromUpstreamCode(code) }
    if (output) return { status: 'running' }
    return { status: 'failed', failure: { kind: 'upstream', upstreamCode: null } }
  }

  return { status: 'running' }
}

function parseSubmitTaskId(json: unknown): TaskId | null {
  const root = asRecord(json)
  const output = asRecord(root?.output)
  return parseTaskId(output?.task_id ?? root?.task_id)
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function misconfiguredError(): Error {
  return new Error(failureMessageJa({ kind: 'misconfigured' }))
}

async function submitToWan(cfg: WanConfig, req: GenerateRequest): Promise<TaskId> {
  let res: Response
  try {
    res = await fetch(`${baseUrl(cfg)}/api/v1/services/aigc/video-generation/video-synthesis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: WAN_MODEL,
        input: { prompt: req.prompt },
        parameters: {
          resolution: req.resolution,
          ratio: req.ratio,
          duration: req.duration,
          audio: req.audio,
          prompt_extend: true,
        },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch {
    throw new Error(failureMessageJa({ kind: 'upstream', upstreamCode: null }))
  }

  const json = await readJson(res)
  const taskId = parseSubmitTaskId(json)
  if (taskId) return taskId

  const state = parseTaskPayload(json)
  if (state.status === 'failed') {
    throw new Error(failureMessageJa(state.failure))
  }
  throw new Error(failureMessageJa({ kind: 'upstream', upstreamCode: null }))
}

async function fetchWanState(cfg: WanConfig, taskId: TaskId): Promise<JobState> {
  let res: Response
  try {
    res = await fetch(`${baseUrl(cfg)}/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch {
    throw new Error(failureMessageJa({ kind: 'upstream', upstreamCode: null }))
  }

  if (res.status === 404) {
    return { status: 'failed', failure: { kind: 'not-found' } }
  }
  if (res.status === 429 || res.status >= 500) {
    throw new Error(failureMessageJa({ kind: 'upstream', upstreamCode: null }))
  }

  return parseTaskPayload(await readJson(res))
}

function requireGenerateRequest(raw: unknown): GenerateRequest {
  const parsed = parseGenerateRequest(raw)
  if (!parsed.ok) {
    throw new Error(parsed.issues.map((issue) => issue.messageJa).join(' '))
  }
  return parsed.value
}

function requireTaskIdPayload(raw: unknown): { taskId: TaskId } {
  const taskId = parseTaskId(raw && typeof raw === 'object' ? (raw as { taskId?: unknown }).taskId : undefined)
  if (!taskId) {
    throw new Error('タスクIDが不正です')
  }
  return { taskId }
}

export const submitVideoJob = createServerFn({ method: 'POST' })
  .validator(requireGenerateRequest)
  .handler(async ({ data }): Promise<TaskId> => {
    const cfg = await readWanConfig()
    if (!cfg) throw misconfiguredError()
    return submitToWan(cfg, data)
  })

export const pollVideoJob = createServerFn({ method: 'GET' })
  .validator(requireTaskIdPayload)
  .handler(async ({ data }): Promise<JobState> => {
    const cfg = await readWanConfig()
    if (!cfg) return { status: 'failed', failure: { kind: 'misconfigured' } }
    return fetchWanState(cfg, data.taskId)
  })
