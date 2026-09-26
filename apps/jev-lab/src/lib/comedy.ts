export type HallAction = 'go' | 'wait' | 'wall' | 'window'
export type PartyAction = 'announce' | 'pay' | 'coat' | 'leave' | 'wait'
export type Personality = 'normal' | 'polite' | 'hurry'

export type HallActor = {
  id: string
  name: string
  direction: 1 | -1
  x: number
  lane: 'center' | 'wall' | 'window'
  passed: boolean
  bubble: string
}

export type HallPair = {
  id: string
  actors: [HallActor, HallActor]
  awkward: number
  caption: string
}

export type HallwayState = {
  kind: 'hallway'
  turn: number
  preset: Personality
  pairs: HallPair[]
  finished: boolean
  ending: string
}

export type PartyEvent = 'quiet' | 'dish' | 'story' | 'toast'

export type PartyState = {
  kind: 'party'
  turn: number
  announced: boolean
  paid: boolean
  coat: boolean
  escaped: boolean
  awkward: number
  event: PartyEvent
  bubble: string
  caption: string
  finished: boolean
  ending: string
}

export type GameState = HallwayState | PartyState

export type Decision = {
  actorId: string
  action: HallAction | PartyAction
  probability?: number
  confidence?: number
}

export type ActiveActor = {
  id: string
  name: string
  actions: Record<string, string>
}

const names = [
  ['美咲', '直人'],
  ['葵', '健'],
  ['遥', '亮'],
]

const hallActions: Record<HallAction, string> = {
  go: '前へ進む',
  wait: '待つ',
  wall: '壁側へ寄る',
  window: '窓側へ寄る',
}

const partyActions: Record<PartyAction, string> = {
  announce: '帰ると宣言',
  pay: '会計する',
  coat: '上着を取る',
  leave: '店を出る',
  wait: '様子を見る',
}

const clone = <T>(value: T): T => structuredClone(value)

export function createHallway(preset: Personality = 'normal'): HallwayState {
  return {
    kind: 'hallway',
    turn: 0,
    preset,
    finished: false,
    ending: '',
    pairs: names.map(([left, right], index) => ({
      id: `pair-${index + 1}`,
      awkward: 0,
      caption: 'あ、どうぞ…',
      actors: [
        { id: `p${index + 1}-left`, name: left, direction: 1, x: 20, lane: 'center', passed: false, bubble: 'あ、どうぞ…' },
        { id: `p${index + 1}-right`, name: right, direction: -1, x: 80, lane: 'center', passed: false, bubble: 'いえいえ…' },
      ],
    })),
  }
}

export function createParty(): PartyState {
  return {
    kind: 'party',
    turn: 0,
    announced: false,
    paid: false,
    coat: false,
    escaped: false,
    awkward: 0,
    event: 'quiet',
    bubble: 'そろそろ…',
    caption: '帰るタイミングを探しています。',
    finished: false,
    ending: '',
  }
}

export function getActors(state: GameState): ActiveActor[] {
  if (state.finished) return []
  if (state.kind === 'party') {
    const actions: Record<string, string> = { ...partyActions }
    if (state.announced) delete actions.announce
    if (state.paid) delete actions.pay
    if (state.coat) delete actions.coat
    return [{ id: 'guest', name: 'あなた', actions }]
  }

  return state.pairs.flatMap((pair) =>
    pair.actors
      .filter((actor) => !actor.passed)
      .map((actor) => ({ id: actor.id, name: actor.name, actions: hallActions })),
  )
}

const validProbability = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

export function parseDecisions(value: unknown, state: GameState): Decision[] | undefined {
  if (state.finished || !Array.isArray(value)) return undefined

  const actors = getActors(state)
  if (value.length !== actors.length) return undefined

  const expected = new Set(actors.map((actor) => actor.id))
  const seen = new Set<string>()
  const output: Decision[] = []

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return undefined

    const item = candidate as Record<string, unknown>
    if (
      typeof item.actorId !== 'string' ||
      typeof item.action !== 'string' ||
      !expected.has(item.actorId) ||
      seen.has(item.actorId) ||
      !Object.hasOwn(actors.find((actor) => actor.id === item.actorId)?.actions ?? {}, item.action) ||
      (item.probability !== undefined && !validProbability(item.probability)) ||
      (item.confidence !== undefined && !validProbability(item.confidence))
    ) {
      return undefined
    }

    seen.add(item.actorId)
    output.push({
      actorId: item.actorId,
      action: item.action as HallAction | PartyAction,
      probability: item.probability,
      confidence: item.confidence,
    })
  }

  return output
}

export function setPartyEvent(state: PartyState, event: PartyEvent): PartyState {
  return {
    ...clone(state),
    event,
    caption: '店内の空気が変わりました。',
  }
}

export function applyDecisions(state: GameState, decisions: Decision[]): GameState {
  const parsed = parseDecisions(decisions, state)
  if (!parsed) throw new Error('invalid decisions')

  const next = clone(state)
  if (next.kind === 'party') return applyPartyDecision(next, parsed[0].action as PartyAction)
  return applyHallwayDecisions(next, parsed)
}

function applyPartyDecision(state: PartyState, action: PartyAction): PartyState {
  const next = state
  next.turn += 1

  if (action === 'announce') {
    next.announced = true
    next.bubble = 'そろそろ帰ります！'
    next.caption = '帰る宣言をしました。'
  } else if (action === 'pay') {
    next.paid = true
    next.bubble = 'お会計だけ先に…'
    next.caption = '会計を済ませました。'
  } else if (action === 'coat') {
    next.coat = true
    next.bubble = '上着、取っていい？'
    next.caption = '上着を確保しました。'
  } else if (action === 'wait') {
    next.awkward = Math.max(0, next.awkward - 1)
    next.bubble = '今じゃないか…'
    next.caption = 'もう少し様子を見ます。'
  } else if (next.paid && next.coat) {
    next.escaped = true
    next.finished = true
    next.bubble = 'お先に失礼します！'
    next.caption = '帰宅成功。店を出られました。'
    next.ending = '見事に帰宅成功！'
  } else {
    next.bubble = '忘れ物…！'
    next.caption = next.paid ? '上着を忘れています。' : '会計を忘れています。'
  }

  if (next.event !== 'quiet' && action !== 'wait') next.awkward = Math.min(100, next.awkward + 2)
  if (!next.announced && action === 'leave') next.awkward = Math.min(100, next.awkward + 2)

  const cycle: PartyEvent[] = ['quiet', 'dish', 'story', 'quiet', 'toast', 'quiet']
  next.event = cycle[next.turn % cycle.length]
  if (next.turn >= 12 && !next.finished) {
    next.finished = true
    next.ending = next.announced
      ? '「そろそろ帰る」から、もう12ターン。'
      : '帰るタイミング、最後まで見つからず。'
  }

  return next
}

function applyHallwayDecisions(state: HallwayState, decisions: Decision[]): HallwayState {
  const next = state
  const decisionsById = new Map(decisions.map((decision) => [decision.actorId, decision.action as HallAction]))
  next.turn += 1

  for (const pair of next.pairs) {
    const active = pair.actors.filter((actor) => !actor.passed)
    if (!active.length) continue

    const actions = active.map((actor) => [actor, decisionsById.get(actor.id)] as const)
    if (actions.some(([, action]) => !action)) continue

    const previous = new Map(active.map((actor) => [actor.id, actor.x]))
    pair.caption = 'すれ違えそうです。'
    if (active.length === 2) {
      const leftAction = actions[0][1] as HallAction
      const rightAction = actions[1][1] as HallAction
      if (leftAction === 'wait' && rightAction === 'wait') {
        pair.awkward += 1
        pair.caption = 'どうぞが渋滞しています。'
      }
      if (
        (leftAction === 'wall' && rightAction === 'wall') ||
        (leftAction === 'window' && rightAction === 'window')
      ) {
        pair.awkward += 1
        pair.caption = 'そっちも、そっち？'
      }
    }

    for (const [actor, action] of actions) moveActor(actor, action as HallAction)

    if (active.length === 2) {
      const [left, right] = active
      const [leftAction, rightAction] = [actions[0][1] as HallAction, actions[1][1] as HallAction]
      const crossedOrOverlapped =
        left.lane === right.lane &&
        (previous.get(left.id) ?? 0) <= (previous.get(right.id) ?? 0) &&
        left.x + 12 >= right.x
      if (crossedOrOverlapped && (leftAction === 'go' || rightAction === 'go')) {
        left.x = previous.get(left.id) as number
        right.x = previous.get(right.id) as number
        pair.awkward += 1
        pair.caption = '譲るつもりが、シンクロ。'
      }
    }

    for (const actor of active) {
      if (actor.x <= 5 || actor.x >= 95) {
        actor.passed = true
        actor.bubble = '通れた！'
      }
    }
  }

  const passed = next.pairs.flatMap((pair) => pair.actors).filter((actor) => actor.passed).length
  if (passed === 6 || next.turn >= 12) {
    next.finished = true
    next.ending = passed === 6 ? '全員、気まずさを越えて通過！' : '廊下は今日も、譲り合いのまま。'
  }

  return next
}

function moveActor(actor: HallActor, action: HallAction): void {
  actor.bubble = hallActions[action]
  if (action === 'wall' || action === 'window') actor.lane = action
  if (action === 'go') actor.x = Math.max(0, Math.min(100, actor.x + actor.direction * 20))
}
