import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  POLL_DEADLINE_MS,
  isActive,
  isPastDeadline,
  isSettled,
  parseStoredRef,
  type ActiveState,
  type GenerateRequest,
  type Job,
  type JobRef,
  type JobState,
  type SettledState,
  type TaskId,
} from './job'
import { pollVideoJob, submitVideoJob } from './wan'

export type Screen =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting'; readonly request: GenerateRequest }
  | { readonly kind: 'rejected'; readonly request: GenerateRequest; readonly message: string }
  | { readonly kind: 'resuming'; readonly ref: JobRef; readonly pollFailures: number }
  | { readonly kind: 'polling'; readonly job: Job<ActiveState>; readonly pollFailures: number }
  | { readonly kind: 'done'; readonly job: Job<SettledState> }

export type Event =
  | { readonly type: 'generate'; readonly request: GenerateRequest }
  | { readonly type: 'accepted'; readonly ref: JobRef }
  | { readonly type: 'submitRejected'; readonly request: GenerateRequest; readonly message: string }
  | { readonly type: 'restore'; readonly ref: JobRef }
  | { readonly type: 'observed'; readonly taskId: TaskId; readonly state: JobState }
  | { readonly type: 'pollFailed'; readonly taskId: TaskId }
  | { readonly type: 'timedOut'; readonly taskId: TaskId }
  | { readonly type: 'reset' }

const STORAGE_KEY = 'wan-video:ticket:v1'

export function canGenerate(screen: Screen): boolean {
  return screen.kind === 'idle' || screen.kind === 'rejected' || screen.kind === 'done'
}

export function pollTarget(
  screen: Screen,
  now: number = Date.now(),
): { taskId: TaskId; failures: number; status: ActiveState['status'] | 'unobserved' } | null {
  if (screen.kind === 'resuming') {
    return { taskId: screen.ref.taskId, failures: screen.pollFailures, status: 'unobserved' }
  }
  if (screen.kind === 'polling') {
    if (isPastDeadline(screen.job.ref.submittedAt, now)) return null
    return {
      taskId: screen.job.ref.taskId,
      failures: screen.pollFailures,
      status: screen.job.state.status,
    }
  }
  return null
}

export function nextPollDelayMs(
  status: ActiveState['status'] | 'unobserved',
  consecutiveFailures: number,
): number {
  if (consecutiveFailures > 0) {
    return Math.min(30_000, 1000 * 2 ** (consecutiveFailures - 1))
  }
  if (status === 'queued') return 3_000
  if (status === 'running') return 5_000
  return 0
}

export function persistedRef(screen: Screen): JobRef | null {
  if (screen.kind === 'resuming') return screen.ref
  if (screen.kind === 'polling') return screen.job.ref
  if (screen.kind === 'done' && screen.job.state.status === 'succeeded') return screen.job.ref
  return null
}

export function reduce(screen: Screen, event: Event): Screen {
  if (event.type === 'reset') return { kind: 'idle' }

  if (event.type === 'generate') {
    if (!canGenerate(screen)) return screen
    return { kind: 'submitting', request: event.request }
  }

  if (event.type === 'accepted') {
    if (screen.kind !== 'submitting' || screen.request !== event.ref.request) return screen
    return {
      kind: 'polling',
      job: { ref: event.ref, state: { status: 'queued' } },
      pollFailures: 0,
    }
  }

  if (event.type === 'submitRejected') {
    if (screen.kind !== 'submitting' || screen.request !== event.request) return screen
    return { kind: 'rejected', request: event.request, message: event.message }
  }

  if (event.type === 'restore') {
    if (screen.kind !== 'idle') return screen
    return { kind: 'resuming', ref: event.ref, pollFailures: 0 }
  }

  if (event.type === 'observed') {
    const ref = inflightRef(screen)
    if (!ref || ref.taskId !== event.taskId) return screen
    if (isActive(event.state)) {
      return { kind: 'polling', job: { ref, state: event.state }, pollFailures: 0 }
    }
    if (isSettled(event.state)) {
      return { kind: 'done', job: { ref, state: event.state } }
    }
    return screen
  }

  if (event.type === 'pollFailed') {
    if (screen.kind === 'resuming' && screen.ref.taskId === event.taskId) {
      return { ...screen, pollFailures: screen.pollFailures + 1 }
    }
    if (screen.kind === 'polling' && screen.job.ref.taskId === event.taskId) {
      return { ...screen, pollFailures: screen.pollFailures + 1 }
    }
    return screen
  }

  if (event.type === 'timedOut') {
    const ref = inflightRef(screen)
    if (!ref || ref.taskId !== event.taskId) return screen
    return {
      kind: 'done',
      job: {
        ref,
        state: { status: 'failed', failure: { kind: 'timeout', waitedMs: POLL_DEADLINE_MS } },
      },
    }
  }

  return screen
}

function inflightRef(screen: Screen): JobRef | null {
  if (screen.kind === 'resuming') return screen.ref
  if (screen.kind === 'polling') return screen.job.ref
  return null
}

function readStoredRef(): JobRef | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseStoredRef(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function writeStoredRef(ref: JobRef | null): void {
  if (typeof window === 'undefined') return
  if (!ref) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      taskId: ref.taskId,
      submittedAt: ref.submittedAt,
      request: ref.request,
    }),
  )
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message
  return '送信に失敗しました。時間をおいて再試行してください。'
}

export interface VideoSession {
  readonly screen: Screen
  generate(request: GenerateRequest): void
  reset(): void
}

export function useVideoSession(): VideoSession {
  const [screen, dispatch] = useReducer(reduce, { kind: 'idle' } satisfies Screen)
  const screenRef = useRef(screen)
  screenRef.current = screen

  useEffect(() => {
    const ref = readStoredRef()
    if (ref) dispatch({ type: 'restore', ref })
  }, [])

  useEffect(() => {
    writeStoredRef(persistedRef(screen))
  }, [screen])

  useEffect(() => {
    const watching = inflightRef(screen)
    if (watching && !pollTarget(screen)) {
      dispatch({ type: 'timedOut', taskId: watching.taskId })
      return
    }

    const target = pollTarget(screen)
    if (!target) return

    const handle = window.setTimeout(() => {
      void pollVideoJob({ data: { taskId: target.taskId } })
        .then((state) => {
          dispatch({ type: 'observed', taskId: target.taskId, state })
        })
        .catch(() => {
          dispatch({ type: 'pollFailed', taskId: target.taskId })
        })
    }, nextPollDelayMs(target.status, target.failures))

    return () => {
      window.clearTimeout(handle)
    }
  }, [screen])

  const generate = useCallback((request: GenerateRequest) => {
    if (!canGenerate(screenRef.current)) return
    dispatch({ type: 'generate', request })
    screenRef.current = { kind: 'submitting', request }
    void submitVideoJob({ data: request })
      .then((taskId) => {
        dispatch({
          type: 'accepted',
          ref: { taskId, submittedAt: Date.now(), request },
        })
      })
      .catch((error: unknown) => {
        dispatch({ type: 'submitRejected', request, message: messageOf(error) })
      })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  return { screen, generate, reset }
}
