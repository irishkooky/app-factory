import { useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Checkbox, Container, Group, SegmentedControl, Select, SimpleGrid, Text, Textarea, TextInput } from '@mantine/core'
import { batchRecords, samples } from '../data/semantic-samples'
import { categoryLabels, validateStatic, type Category, type FormRecord } from '../lib/semantic'
import { comparisonModels, parseComparisonResponse, type ComparisonDecision, type ComparisonModelId, type ComparisonResponse } from '../lib/comparison'

type ModelState =
  | { status: 'waiting' }
  | { status: 'success'; response: ComparisonResponse; elapsedMs: number }
  | { status: 'error'; error: string }
  | { status: 'canceled' }
type ModelStates = Partial<Record<ComparisonModelId, ModelState>>
type RequestHandle = { controller: AbortController; timer: ReturnType<typeof setTimeout> }
type CheckField = Exclude<keyof ComparisonDecision, 'id'>
const checkFields: CheckField[] = ['identity', 'company', 'intent', 'detail']
const checkLabels: Record<CheckField, string> = { identity: '名前と会社名', company: '会社名・屋号', intent: '本文の意図', detail: '具体性' }
const choiceLabels: Record<CheckField, Record<string, string>> = {
  identity: { aligned: '自然な組み合わせ', swapped: '入れ替わっていそう', unclear: '判断できない' },
  company: { plausible: '会社・屋号として自然', person_like: '個人名に見える', unclear: '判断できない' },
  intent: { ...categoryLabels, unclear: '判断できない' },
  detail: { sufficient: '十分具体的', vague: 'もう少し詳しく', unclear: '判断できない' },
}
const providerIds: Record<ComparisonModelId, string> = {
  jev: 'typesafe-ai/jev', gpt: 'openai/gpt-4.1-mini', gemini: 'google/gemini-2.5-flash-lite', claude: 'anthropic/claude-haiku-4.5',
}
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function CounterClerk({ model, status }: { model: ComparisonModelId; status?: ModelState['status'] }) {
  const colors = { jev: '#9bc7b7', gpt: '#eed189', gemini: '#9fbbd7', claude: '#dfa58e' }
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className="counter-clerk">
      <g stroke="#272b3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 76 Q15 55 40 55 Q65 55 67 76" fill={colors[model]} />
        <path d="M21 26 Q20 8 41 7 Q62 8 61 29 L58 46 Q51 61 39 59 Q23 57 21 42Z" fill="#efd2b5" />
        <path d="M21 28 Q15 7 39 5 Q65 3 63 28 L49 19 Q36 28 21 28Z" fill="#333647" />
        {status === 'success' ? <path d="M28 36 Q32 30 36 36 M46 36 Q50 30 54 36 M34 47 Q40 53 47 47" fill="none" /> : status === 'error' ? <path d="M29 35 L35 37 M46 37 L52 35 M35 49 L46 46" fill="none" /> : <path d="M29 36 L35 36 M46 36 L52 36 M35 48 L46 48" fill="none" />}
        <path d="M41 36 L39 42 L43 42 M28 62 L35 76 M53 62 L46 76" fill="none" strokeWidth="1.3" />
      </g>
    </svg>
  )
}

export function ComparisonLab() {
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [record, setRecord] = useState<FormRecord>(() => ({ ...samples[0].record }))
  const recordRef = useRef(record)
  const [sampleId, setSampleId] = useState<string | undefined>(samples[0].id)
  const [selectedModels, setSelectedModels] = useState<ComparisonModelId[]>(() => comparisonModels.map((model) => model.id))
  const [states, setStates] = useState<ModelStates>({})
  const [busy, setBusy] = useState(false)
  const [inspectedId, setInspectedId] = useState(batchRecords[0].id)
  const [snapshot, setSnapshot] = useState<FormRecord[]>()
  const generation = useRef(0)
  const busyRef = useRef(false)
  const requests = useRef(new Map<ComparisonModelId, RequestHandle>())
  const mounted = useRef(true)
  const errors = validateStatic(record)
  const valid = mode === 'batch' || Object.keys(errors).length === 0
  const records = mode === 'batch' ? batchRecords : [record]
  const displayedRecords = snapshot ?? records
  const inspected = displayedRecords.find((item) => item.id === inspectedId) ?? displayedRecords[0]
  const successes = comparisonModels.flatMap((model) => {
    const state = states[model.id]
    return state?.status === 'success' ? [{ model, state }] : []
  })
  const differences = successes.length < 2 ? 0 : displayedRecords.reduce((sum, item) => (
    sum + checkFields.filter((field) => new Set(successes.map(({ state }) => state.response.decisions.find((decision) => decision.id === item.id)?.[field])).size > 1).length
  ), 0)

  const abortAll = () => {
    generation.current += 1
    for (const handle of requests.current.values()) { clearTimeout(handle.timer); handle.controller.abort() }
    requests.current.clear()
    busyRef.current = false
    setBusy(false)
  }
  const invalidate = () => { abortAll(); setStates({}); setSnapshot(undefined) }
  const changeRecord = (next: FormRecord, selected?: string) => {
    invalidate()
    recordRef.current = next
    setRecord(next)
    setSampleId(selected)
  }
  const edit = <K extends keyof FormRecord>(field: K, value: FormRecord[K]) => changeRecord({ ...recordRef.current, [field]: value })
  const toggleModel = (id: ComparisonModelId, checked: boolean) => {
    if (!checked && selectedModels.length === 1) return
    invalidate()
    setSelectedModels((previous) => checked ? [...previous, id] : previous.filter((item) => item !== id))
  }
  const cancel = () => {
    abortAll()
    setStates((previous) => Object.fromEntries(Object.entries(previous).map(([id, state]) => [id, state.status === 'waiting' ? { status: 'canceled' } : state])) as ModelStates)
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      generation.current += 1
      for (const handle of requests.current.values()) { clearTimeout(handle.timer); handle.controller.abort() }
      requests.current.clear()
    }
  }, [])

  const compare = async () => {
    if (busyRef.current || !valid || selectedModels.length === 0) return
    const inputs = (mode === 'batch' ? batchRecords : [recordRef.current]).map((item) => ({ ...item }))
    if (inputs.some((item) => Object.keys(validateStatic(item)).length)) return
    const models = [...selectedModels]
    const run = ++generation.current
    busyRef.current = true
    setBusy(true)
    setSnapshot(inputs)
    setStates(Object.fromEntries(models.map((id) => [id, { status: 'waiting' }])) as ModelStates)
    await Promise.all(models.map(async (model) => {
      const controller = new AbortController()
      const started = performance.now()
      let timedOut = false
      let userError: string | undefined
      const failure = (message: string) => { userError = message; return new Error(message) }
      const timer = setTimeout(() => { timedOut = true; controller.abort() }, 45000)
      requests.current.set(model, { controller, timer })
      try {
        const response = await fetch('/api/compare', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ records: inputs, model }), signal: controller.signal,
        })
        let raw: unknown
        try { raw = await response.json() }
        catch { throw failure('結果を正しく受け取れませんでした。もう一度比較できます。') }
        if (run !== generation.current || !mounted.current) return
        if (timedOut) throw failure('応答が間に合いませんでした。時間をおいて試してください。')
        if (!response.ok) throw failure(isObject(raw) && typeof raw.error === 'string' ? raw.error : 'このモデルの判定を受け取れませんでした。')
        const parsed = parseComparisonResponse(raw, inputs, model)
        if (!parsed) throw failure('判定の形式が合わないため、このモデルの結果は表示できません。')
        const elapsedMs = performance.now() - started
        setStates((previous) => ({ ...previous, [model]: { status: 'success', response: parsed, elapsedMs } }))
      } catch {
        if (run !== generation.current || !mounted.current) return
        setStates((previous) => ({ ...previous, [model]: { status: 'error', error: timedOut ? '45秒以内に応答が完了しませんでした。時間をおいて試してください。' : userError ?? '通信できませんでした。接続を確認して、もう一度試してください。' } }))
      } finally {
        clearTimeout(timer)
        if (requests.current.get(model)?.controller === controller) requests.current.delete(model)
      }
    }))
    if (run === generation.current && mounted.current) { busyRef.current = false; setBusy(false) }
  }

  return (
    <main className="comparison-lab">
      <Container size="xl">
        <header className="comparison-nav">
          <a className="comparison-brand" href="/"><strong>Jev</strong><span>気づくフォーム</span></a>
          <nav aria-label="ほかの実験"><a href="/">フォームへ戻る</a><a href="/theater">あるある劇場 ↗</a></nav>
        </header>
        <section className="comparison-hero">
          <div><p className="comparison-eyebrow">受付さんを、交代してみよう。</p><h1>同じ受付、<span>AIを交代。</span></h1><p>見る入力は同じ。選べる答えも同じ。<br className="comparison-mobile-break" />気づくことと、返ってくる速さを並べてみる。</p></div>
          <div className="counter-ticket" aria-hidden="true">本日の受付<strong>{selectedModels.length}名</strong><span>それぞれの気づきを。</span></div>
        </section>
        <section className="comparison-input" aria-label="比較に使う入力">
          <div className="comparison-input-header"><h2>01 <span>全員に、同じ入力を渡す。</span></h2><SegmentedControl aria-label="比較する件数" value={mode} onChange={(value) => { invalidate(); setMode(value as 'single' | 'batch'); setInspectedId(batchRecords[0].id) }} data={[{ value: 'single', label: '1件で比較' }, { value: 'batch', label: '8件一括で比較' }]} /></div>
          {mode === 'single' ? <>
            <nav className="comparison-samples" aria-label="比較する入力例">{samples.map((sample, index) => <button key={sample.id} className={sampleId === sample.id ? 'active' : ''} aria-pressed={sampleId === sample.id} onClick={() => changeRecord({ ...sample.record }, sample.id)}><small>{index + 1}</small>{sample.label}</button>)}</nav>
            <div className="comparison-form-grid">
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                <TextInput label="お名前" maxLength={100} value={record.name} error={errors.name} onChange={(event) => edit('name', event.currentTarget.value)} autoComplete="off" />
                <TextInput label="会社名・屋号" maxLength={100} value={record.company} error={errors.company} onChange={(event) => edit('company', event.currentTarget.value)} autoComplete="off" />
                <TextInput label="メールアドレス" maxLength={254} value={record.email} error={errors.email} onChange={(event) => edit('email', event.currentTarget.value)} autoComplete="off" />
                <Select label="お問い合わせの種類" value={record.category} allowDeselect={false} data={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => { if (value && Object.hasOwn(categoryLabels, value)) edit('category', value as Category) }} />
              </SimpleGrid>
              <Textarea label="お問い合わせ内容" value={record.message} maxLength={600} minRows={4} autosize error={errors.message} onChange={(event) => edit('message', event.currentTarget.value)} />
            </div>
          </> : <div className="comparison-batch-input"><p>架空の8件を、各モデルにまとめて渡します。1モデルにつき32個の判断です。</p><details><summary>渡す8件の入力をすべて見る</summary><div className="comparison-record-list">{batchRecords.map((item, index) => <article key={item.id}><strong>{String(index + 1).padStart(2, '0')} · {item.name} / {item.company}</strong><span>{item.email} · {categoryLabels[item.category]}</span><p>{item.message}</p></article>)}</div></details></div>}
          <div className="comparison-model-selection"><span>参加する受付さん</span><Group gap="lg">{comparisonModels.map((model) => <Checkbox key={model.id} checked={selectedModels.includes(model.id)} disabled={selectedModels.length === 1 && selectedModels.includes(model.id)} label={model.label} color="teal" onChange={(event) => toggleModel(model.id, event.currentTarget.checked)} />)}</Group></div>
          <div className="comparison-run"><Group><Button color="dark" size="md" disabled={!valid || busy} onClick={() => void compare()}>{busy ? 'それぞれの返答を待っています…' : Object.keys(states).length ? 'もう一度比較' : '比較を始める'}<span aria-hidden="true"> ↗</span></Button>{busy && <Button color="gray" variant="subtle" onClick={cancel}>キャンセル</Button>}</Group><Text size="xs" c="dimmed">押したときだけ、{selectedModels.length}モデルを各1回呼び出します。自動再試行はしません。</Text></div>
        </section>

        <section className="comparison-results" aria-label="モデルごとの結果">
          <div className="comparison-results-heading"><h2>02 <span>返ってきた受付から、開けます。</span></h2>{mode === 'batch' && <Select label="見比べる入力" value={inspected.id} onChange={(value) => { if (value) setInspectedId(value) }} data={displayedRecords.map((item, index) => ({ value: item.id, label: `${index + 1}. ${item.name} / ${item.company}` }))} allowDeselect={false} className="comparison-record-select" />}</div>
          {mode === 'batch' && <div className="inspected-record"><strong>{inspected.name} / {inspected.company}</strong><p>{inspected.message}</p><span>選択した窓口：{categoryLabels[inspected.category]}</span></div>}
          <div className="reception-counters">
            {comparisonModels.filter((model) => selectedModels.includes(model.id)).map((model, index) => {
              const state = states[model.id]
              const decision = state?.status === 'success' ? state.response.decisions.find((item) => item.id === inspected.id) : undefined
              return (
                <article key={model.id} data-model={model.id} data-status={state?.status === 'waiting' ? 'pending' : state?.status ?? 'idle'} className={`reception-counter counter-${model.id} state-${state?.status ?? 'idle'}`} aria-label={`${model.label}の結果`}>
                  <div className="counter-heading"><span className="counter-number">窓口 {String(index + 1).padStart(2, '0')}</span><CounterClerk model={model.id} status={state?.status} /></div>
                  <h3>{model.label}</h3><span className="counter-method">{model.kind === 'evaluation' ? '評価APIで選択' : 'JSONを生成'}</span>
                  <div className="counter-status" aria-live="polite">
                    {state?.status === 'success' ? <><span className="counter-complete">返答が届きました</span><strong>{(state.elapsedMs / 1000).toFixed(2)}<small> 秒</small></strong><span>{state.response.decisions.length}件・{state.response.decisions.length * 4}判断 / 通信込み実測</span></> : state?.status === 'waiting' ? <><span className="counter-waiting-dots" aria-hidden="true">•••</span><p>まだ、考えています。</p></> : state?.status === 'error' ? <Alert color="red" title="今回は受け取れませんでした">{state.error}</Alert> : state?.status === 'canceled' ? <p>キャンセルしました。<small>完了した結果は、そのまま残します。</small></p> : <p>受付、待機中。<small>上のボタンで、同時にスタート。</small></p>}
                  </div>
                  {decision && <dl className="counter-decisions">{checkFields.map((field) => <div key={field}><dt>{checkLabels[field]}</dt><dd>{choiceLabels[field][decision[field]]}</dd></div>)}</dl>}
                  <details className="counter-details"><summary>モデルと判定JSON</summary><code>{providerIds[model.id]}</code>{state?.status === 'success' ? <pre>{JSON.stringify(state.response.decisions, null, 2)}</pre> : <p>有効な結果が届くと表示します。</p>}</details>
                </article>
              )
            })}
          </div>
          {successes.length >= 2 && <div className="comparison-differences"><Badge variant="light" color="teal">完了した{successes.length}モデルを比較</Badge><p>{differences === 0 ? '今のところ、すべての観点で同じ選択でした。' : `${displayedRecords.length * 4}個の観点のうち、${differences}個で選択が分かれました。`}<span>一致は正解の証明ではありません。Jevを正解として扱っていません。</span></p></div>}
        </section>
        <footer className="comparison-footer"><p>同じ入力・同じ選択肢。Jevは評価API、ほかはJSON生成。通信と出力完了までを計測。1回の結果で優劣は決まりません。</p><p>デモ用の入力例です。チェック時は入力内容をAIへ送信します。メールアドレスは意味判定に使いません。</p><span>SAME QUESTION, DIFFERENT COUNTERS.</span></footer>
      </Container>
    </main>
  )
}
