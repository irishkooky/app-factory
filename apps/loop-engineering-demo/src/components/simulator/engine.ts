// ループシミュレーターの純粋ロジック（React非依存）。
// UIコンポーネントからはこのモジュールの関数だけを呼び出す。

export type FeedbackQuality = 'none' | 'weak' | 'strong'

export const TOTAL_TESTS = 10
export const INITIAL_PASSING = 3

export interface IterationEvent {
  /** 1始まり */
  iteration: number
  /** その回にエージェントがした事の短文 */
  action: string
  /** 真のテスト通過数（0..10にクランプ） */
  actualPassing: number
  /** ループが観測した通過数（検証しなかった回は null） */
  observed: number | null
  /** 補足（リグレッション検知など） */
  note?: string
}

export type StopReason = 'goal' | 'budget' | 'self-report'

export interface RunResult {
  quality: FeedbackQuality
  maxIterations: number
  events: IterationEvent[]
  finalPassing: number
  stoppedBy: StopReason
}

/**
 * mulberry32: シード付き擬似乱数生成器。
 * 同じシードなら同じ数列を返すため、再生アニメーションのシナリオを
 * 一度計算してから再現するのに使う。
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

const ACTION_BANK = [
  '失敗テストのログを読み、該当箇所を修正',
  'スタックトレースを追い、原因を特定して修正',
  'エッジケースを洗い出し、まとめて修正',
  '型エラーを解消しつつロジックを修正',
] as const

function pickAction(rng: () => number): string {
  const idx = Math.min(ACTION_BANK.length - 1, Math.floor(rng() * ACTION_BANK.length))
  return ACTION_BANK[idx]
}

function simulateStrong(maxIterations: number, rng: () => number): RunResult {
  const events: IterationEvent[] = []
  let actualPassing = INITIAL_PASSING
  let stoppedBy: StopReason = 'budget'
  let forcedFixNext = false

  for (let i = 1; i <= maxIterations; i++) {
    let delta: number
    let note: string | undefined

    if (forcedFixNext) {
      delta = 2
      note = '検知したリグレッションを修正'
      forcedFixNext = false
    } else if (rng() < 0.15) {
      delta = -1
      note = '修正が別のテストを壊した → テストが即検知'
      forcedFixNext = true
    } else {
      delta = 1 + Math.floor(rng() * 3)
    }

    const action = pickAction(rng)
    actualPassing = clamp(actualPassing + delta, 0, TOTAL_TESTS)

    events.push({
      iteration: i,
      action,
      actualPassing,
      observed: actualPassing,
      note,
    })

    if (actualPassing >= TOTAL_TESTS) {
      stoppedBy = 'goal'
      break
    }
    if (i === maxIterations) {
      stoppedBy = 'budget'
    }
  }

  return {
    quality: 'strong',
    maxIterations,
    events,
    finalPassing: events.length > 0 ? events[events.length - 1].actualPassing : INITIAL_PASSING,
    stoppedBy,
  }
}

function simulateWeak(maxIterations: number, rng: () => number): RunResult {
  const events: IterationEvent[] = []
  let actualPassing = INITIAL_PASSING
  let stoppedBy: StopReason = 'budget'

  for (let i = 1; i <= maxIterations; i++) {
    const r = rng()
    let delta: number
    if (r < 0.2) delta = -1
    else if (r < 0.5) delta = 0
    else if (r < 0.8) delta = 1
    else delta = 2

    const action = pickAction(rng)
    actualPassing = clamp(actualPassing + delta, 0, TOTAL_TESTS)

    const verifies = i % 3 === 0
    const observed = verifies ? actualPassing : null

    events.push({
      iteration: i,
      action,
      actualPassing,
      observed,
      note: verifies ? undefined : '検証せず次の修正へ',
    })

    if (verifies && actualPassing >= TOTAL_TESTS) {
      stoppedBy = 'goal'
      break
    }
    if (i === maxIterations) {
      stoppedBy = 'budget'
    }
  }

  return {
    quality: 'weak',
    maxIterations,
    events,
    finalPassing: events.length > 0 ? events[events.length - 1].actualPassing : INITIAL_PASSING,
    stoppedBy,
  }
}

function simulateNone(maxIterations: number, rng: () => number): RunResult {
  const events: IterationEvent[] = []
  let actualPassing = INITIAL_PASSING
  let stoppedBy: StopReason = 'budget'

  for (let i = 1; i <= maxIterations; i++) {
    const r = rng()
    let delta: number
    if (r < 0.5) delta = 1
    else if (r < 0.8) delta = 0
    else delta = -1

    const action = pickAction(rng)
    actualPassing = clamp(actualPassing + delta, 0, TOTAL_TESTS)

    events.push({
      iteration: i,
      action,
      actualPassing,
      observed: null,
    })

    if (i === 3) {
      const last = events[events.length - 1]
      last.note = last.note
        ? `${last.note} / エージェントの自己申告で終了（実際の通過数は不明のまま）`
        : 'エージェントの自己申告で終了（実際の通過数は不明のまま）'
      stoppedBy = 'self-report'
      break
    }
    if (i === maxIterations) {
      stoppedBy = 'budget'
    }
  }

  return {
    quality: 'none',
    maxIterations,
    events,
    finalPassing: events.length > 0 ? events[events.length - 1].actualPassing : INITIAL_PASSING,
    stoppedBy,
  }
}

export function simulateRun(
  quality: FeedbackQuality,
  maxIterations: number,
  rng: () => number,
): RunResult {
  const safeMax = clamp(Math.round(maxIterations), 1, 100)

  switch (quality) {
    case 'strong':
      return simulateStrong(safeMax, rng)
    case 'weak':
      return simulateWeak(safeMax, rng)
    case 'none':
      return simulateNone(safeMax, rng)
    default:
      return simulateStrong(safeMax, rng)
  }
}
