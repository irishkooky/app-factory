import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Alert, Badge, Button, Container, Group, SegmentedControl, Switch, Text } from '@mantine/core'
import { ComedyStage } from '../components/ComedyStage'
import {
  applyDecisions, createHallway, createParty, getActors, parseDecisions, setPartyEvent,
  type Decision, type GameState, type PartyEvent, type Personality,
} from '../lib/comedy'
import './index.css'

export const Route = createFileRoute('/theater')({
  head: () => ({ meta: [{ title: 'Jev 日常あるある劇場 — 判断は爆速。空気は読める？' }] }),
  component: ComedyTheater,
})
const actionLabels: Record<string, string> = {
  go: '進む', wait: '待つ', wall: '壁側へ', window: '窓側へ',
  announce: '帰ると宣言', pay: 'お会計', coat: '上着を取る', leave: '帰る',
}
type Round = { decisions: Decision[]; names: Record<string, string>; source: 'Jev' | '手動' }
type ActiveCall = { started: number; settled: boolean }
const object = (value: unknown): Record<string, unknown> | undefined => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined
)
const sceneCopy = {
  hallway: { number: '01', title: 'お先にどうぞ地獄', subtitle: 'その一歩が、なぜか揃う。', eyebrow: '気遣い、衝突中。' },
  party: { number: '02', title: '帰れない飲み会', subtitle: '「そろそろ」が、終わらない。', eyebrow: '帰宅までが、飲み会です。' },
}

function ComedyTheater() {
  const [state, setState] = useState<GameState>(() => createHallway())
  const stateRef = useRef(state)
  const [busy, setBusy] = useState(false)
  const [continuous, setContinuous] = useState(false)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string>()
  const [capture, setCapture] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [aiCount, setAiCount] = useState(0)
  const [manualCount, setManualCount] = useState(0)
  const [round, setRound] = useState<Round>()
  const generation = useRef(0)
  const controller = useRef<AbortController | undefined>(undefined)
  const activeCall = useRef<ActiveCall | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const wake = useRef<(() => void) | undefined>(undefined)
  const mounted = useRef(true)
  const busyRef = useRef(false)

  const update = (next: GameState) => { stateRef.current = next; setState(next) }
  const settle = (call?: ActiveCall) => {
    if (!call || call.settled) return
    call.settled = true
    const duration = performance.now() - call.started
    if (mounted.current) setElapsed((total) => total + duration)
    if (activeCall.current === call) activeCall.current = undefined
  }
  const cancel = (countTime: boolean) => {
    generation.current += 1
    if (countTime) settle(activeCall.current)
    else if (activeCall.current) activeCall.current.settled = true
    activeCall.current = undefined
    controller.current?.abort()
    controller.current = undefined
    if (timer.current) clearTimeout(timer.current)
    wake.current?.()
    wake.current = undefined
    busyRef.current = false
    setBusy(false)
    setContinuous(false)
  }
  const reset = (kind = stateRef.current.kind, preset?: Personality) => {
    cancel(false)
    update(kind === 'party' ? createParty() : createHallway(preset ?? (stateRef.current.kind === 'hallway' ? stateRef.current.preset : 'normal')))
    setPaused(false)
    setError(undefined)
    setElapsed(0)
    setAiCount(0)
    setManualCount(0)
    setRound(undefined)
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      generation.current += 1
      controller.current?.abort()
      if (timer.current) clearTimeout(timer.current)
      wake.current?.()
    }
  }, [])

  const execute = async (auto: boolean) => {
    if (busyRef.current || stateRef.current.finished) return
    busyRef.current = true
    const run = ++generation.current
    setBusy(true)
    setContinuous(auto)
    setPaused(false)
    setError(undefined)
    try {
      do {
        if (run !== generation.current) break
        const snapshot = stateRef.current
        if (snapshot.finished) break
        const abort = new AbortController()
        controller.current = abort
        const call: ActiveCall = { started: performance.now(), settled: false }
        activeCall.current = call
        try {
          const response = await fetch('/api/comedy', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ state: snapshot }), signal: abort.signal,
          })
          let raw: unknown
          if (response.headers.get('content-type')?.includes('application/json')) {
            try { raw = await response.json() }
            catch { throw new Error('判断を正しく受け取れませんでした。この場面からやり直せます。') }
          }
          if (run !== generation.current) break
          settle(call)
          const data = object(raw)
          if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'うまく通信できませんでした。もう一度試せます。')
          const decisions = parseDecisions(data?.decisions, snapshot)
          if (!decisions) throw new Error('判断を正しく受け取れませんでした。この場面からやり直せます。')
          const next = applyDecisions(snapshot, decisions)
          update(next)
          setRound({ decisions, names: Object.fromEntries(getActors(snapshot).map((actor) => [actor.id, actor.name])), source: 'Jev' })
          setAiCount((count) => count + decisions.length)
          controller.current = undefined
          if (!auto || next.finished) break
          await new Promise<void>((resolve) => {
            wake.current = resolve
            timer.current = setTimeout(() => { wake.current = undefined; resolve() }, 1000)
          })
        } catch (failure) {
          if (run !== generation.current) break
          settle(call)
          setError(failure instanceof Error ? failure.message : '通信に失敗しました。もう一度試せます。')
          setPaused(true)
          break
        }
      } while (auto && run === generation.current)
    } finally {
      if (run === generation.current) {
        busyRef.current = false
        setBusy(false)
        setContinuous(false)
        controller.current = undefined
      }
    }
  }

  const manual = (action: string) => {
    if (busyRef.current || stateRef.current.finished) return
    const snapshot = stateRef.current
    const actors = getActors(snapshot)
    const decisions: Decision[] = actors.map((actor, index) => ({
      actorId: actor.id,
      action: (action === 'split' ? (index % 2 ? 'window' : 'wall') : action) as Decision['action'],
    }))
    update(applyDecisions(snapshot, decisions))
    setRound({ decisions, names: Object.fromEntries(actors.map((actor) => [actor.id, actor.name])), source: '手動' })
    setManualCount((count) => count + decisions.length)
    setError(undefined)
    setPaused(false)
  }
  const intervene = (event: PartyEvent) => {
    if (busyRef.current || stateRef.current.kind !== 'party' || stateRef.current.finished) return
    update(setPartyEvent(stateRef.current, event))
  }
  const copy = sceneCopy[state.kind]
  const awkward = state.kind === 'hallway'
    ? state.pairs.reduce((sum, pair) => sum + pair.awkward, 0) : state.awkward
  const passed = state.kind === 'hallway' ? state.pairs.flatMap((pair) => pair.actors).filter((actor) => actor.passed).length : 0

  return (
    <main className={`comedy-app ${capture ? 'capture-mode' : ''}`}>
      <Container size="xl">
        <header className="theater-nav">
          <a className="theater-brand" href="/" aria-label="気づくフォームへ戻る"><span className="brand-dot" />Jev <span>日常あるある劇場</span></a>
          <Switch label="撮影モード" checked={capture} onChange={(event) => setCapture(event.currentTarget.checked)} color="dark" size="sm" />
        </header>
        <section className="theater-hero">
          <div>
            <p className="eyebrow">小さな気まずさ、大きな実験。</p>
            <h1>判断は爆速。<span>空気は読める？</span></h1>
            <p className="hero-description">譲りたいのに通れない。帰りたいのに帰れない。<br className="mobile-break" />そんな日常を、Jevに任せてみる。</p>
          </div>
          <div className="hero-stamp" aria-hidden="true">あるあるを<br /><strong>実験中。</strong><span>JEV THEATER</span></div>
        </section>
        <nav className="scene-tabs" aria-label="実験する場面">
          {(['hallway', 'party'] as const).map((kind) => (
            <button key={kind} className={`scene-tab ${state.kind === kind ? 'active' : ''}`} aria-pressed={state.kind === kind} onClick={() => { if (state.kind !== kind) reset(kind) }}>
              <span className="scene-number">{sceneCopy[kind].number}</span>
              <span><strong>{sceneCopy[kind].title}</strong><small>{sceneCopy[kind].subtitle}</small></span>
              <span className="scene-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
        </nav>
        <section className={`theater-frame ${state.kind}`} aria-label={copy.title}>
          <div className="stage-heading">
            <div><span className="on-air-dot" /><strong>{copy.eyebrow}</strong></div>
            <span className="turn-counter">SCENE <b>{String(state.turn).padStart(2, '0')}</b><span> / 12</span></span>
          </div>
          <ComedyStage state={state} pending={busy} />
          <div className="stage-caption" aria-live="polite" aria-atomic="true">
            <span className="caption-label">ただいまの空気</span>
            <strong>{state.finished ? state.ending : state.kind === 'party' ? state.caption : state.turn === 0 ? (state.preset === 'hurry' ? '急いでいるときに限って、鉢合わせ。' : '向かいから人が。さて、どちらが先に？') : state.pairs[0].caption}</strong>
            <span className="caption-score">{state.kind === 'hallway' ? `${passed} / 6 人 通過` : state.escaped ? '帰宅成功！' : 'まだ、お店にいます。'}</span>
          </div>
        </section>
        <section className="director-desk" aria-label="実験の操作">
          <div className="play-controls">
            <Group gap="sm">
              <Button className="play-button" size="md" color="dark" disabled={busy || state.finished} onClick={() => void execute(true)}>{continuous ? '観察中…' : paused ? '連続で再開' : '連続で観察'}<span aria-hidden="true"> ▶</span></Button>
              <Button size="md" variant="default" disabled={busy || state.finished} onClick={() => void execute(false)}>Jevで1ターン</Button>
              {busy && <Button size="md" variant="outline" color="red" onClick={() => { cancel(true); setPaused(true) }}>停止</Button>}
              <Button variant="subtle" color="dark" onClick={() => reset()}>最初から ↻</Button>
            </Group>
            <Text size="xs" c="dimmed">{busy ? '観察中。行動が届くたびに、場面が進みます。場面の切り替え・停止はいつでもできます。' : state.finished ? '幕が下りました。最初から、別の展開を試してみよう。' : '再生を押すまでAIは動きません。最大12ターンの小さな実験。'}</Text>
          </div>
          {error && <Alert color="red" title="この場面で一時停止" mt="md">{error}</Alert>}
          {paused && !error && <Text size="sm" mt="sm" c="dimmed">一時停止中。同じ場面から続けられます。</Text>}
          <div className="director-options">
            {state.kind === 'hallway' ? (
              <div className="personality-control"><label>今日のみなさん</label><SegmentedControl aria-label="登場人物の性格" value={state.preset} onChange={(value) => reset('hallway', value as Personality)} data={[{ value: 'normal', label: 'ふつう' }, { value: 'polite', label: '気遣いすぎ' }, { value: 'hurry', label: '全員、急ぎ' }]} /></div>
            ) : (
              <div className="intervention-control"><label>あなたの無茶振り</label><Group gap="xs">
                {([['dish', '料理を追加'], ['story', '長話が始まる'], ['toast', 'もう一杯！'], ['quiet', 'ひと息つく']] as const).map(([event, label]) => (
                  <Button key={event} size="xs" variant={state.event === event ? 'filled' : 'default'} color="dark" disabled={busy || state.finished} onClick={() => intervene(event)}>{label}</Button>
                ))}
              </Group></div>
            )}
            <div className="small-metrics"><span>Jevの判断 <b>{aiCount}</b> 回</span><span>AI通信時間 <b>{(elapsed / 1000).toFixed(2)}</b> 秒</span><span>気まずさ <b>{awkward}</b><small>ゲーム内指標</small></span></div>
          </div>
        </section>
        <div className="backstage">
          <details className="backstage-panel"><summary>手動で試す <span>あなたならどうする？</span></summary>
            <Text size="sm" mb="sm">AIを使わず、あなたが次の行動を選びます。Jevの判断回数には含まれません。</Text>
            <Group gap="xs">
              {state.kind === 'hallway' ? <>
                <Button variant="default" disabled={busy || state.finished} onClick={() => manual('wait')}>全員「どうぞ」</Button>
                <Button variant="default" disabled={busy || state.finished} onClick={() => manual('go')}>全員、一歩進む</Button>
                <Button variant="default" disabled={busy || state.finished} onClick={() => manual('split')}>左右に避ける</Button>
              </> : Object.keys(getActors(state)[0]?.actions ?? {}).map((action) => <Button key={action} variant="default" disabled={busy || state.finished} onClick={() => manual(action)}>{actionLabels[action]}</Button>)}
            </Group>
            <Text size="xs" mt="sm" c="dimmed">手動の判断：{manualCount}回</Text>
          </details>
          <details className="backstage-panel"><summary>判断を見る <span>直前の行動と確率</span></summary>
            {round ? <><Badge color={round.source === 'Jev' ? 'teal' : 'gray'} variant="light" mb="sm" tt="none">{round.source}が選択</Badge><div className="decision-list">{round.decisions.map((decision) => <div key={decision.actorId}><strong>{round.names[decision.actorId] ?? decision.actorId}</strong><span>{actionLabels[decision.action]}</span><small>{decision.probability === undefined ? '選択確率 —' : `選択確率 ${Math.round(decision.probability * 100)}%`}{decision.confidence !== undefined ? ` / 信頼度 ${Math.round(decision.confidence * 100)}%` : ''}</small></div>)}</div></> : <Text size="sm" c="dimmed">まだ誰も動いていません。まずは1ターン。</Text>}
          </details>
        </div>
        <footer className="theater-footer"><p>行動はJev、吹き出しと演出はゲーム側で用意しています。</p><p>AI通信時間はブラウザで計測。演出の待ち時間を除き、失敗・停止した通信も含みます。<br />無料枠の利用制限に達すると停止します。手動でも遊べます。</p><span>JEV THEATER · A LITTLE AWKWARD, A LOT OF FUN.</span></footer>
      </Container>
    </main>
  )
}
