import { useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Container, Group, SegmentedControl, Select, SimpleGrid, Text, Textarea, TextInput } from '@mantine/core'
import { batchRecords, samples } from '../data/semantic-samples'
import { categoryLabels, parseSemanticResponse, validateStatic, type Category, type FormRecord, type SemanticResult } from '../lib/semantic'
import { nodeKey, planSummary, SemanticRenderer } from './SemanticRenderer'

type Mood = 'asleep' | 'checking' | 'noticed' | 'satisfied'
type ResultSnapshot = { record: FormRecord; result: SemanticResult }
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function Receptionist({ mood }: { mood: Mood }) {
  return (
    <svg viewBox="0 0 140 130" className={`receptionist mood-${mood}`} role="img" aria-label={`受付さん：${{ asleep: '待機中', checking: '確認中', noticed: '気づいた', satisfied: 'うなずいた' }[mood]}`}>
      <ellipse cx="70" cy="121" rx="43" ry="6" fill="#d8d6c8" />
      <g stroke="#22263b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M33 120 L39 92 Q70 80 101 92 L108 120" fill="#9ac6b6" />
        <path d="M58 88 L62 103 L70 95 L78 103 L83 88" fill="#fffcf1" />
        <path d="M34 47 Q26 16 66 12 Q109 8 109 46 L105 72 Q101 94 72 96 Q38 94 33 72Z" fill="#eed1b4" />
        <path d="M33 50 Q22 14 65 9 Q110 5 111 50 L94 44 L86 26 Q70 44 33 50Z" fill="#343744" />
        <path d="M32 59 Q20 52 26 68 L34 73 M109 59 Q120 53 114 68 L107 73" fill="#eed1b4" />
        {mood === 'noticed' ? <><ellipse cx="54" cy="63" rx="3" ry="5" fill="#22263b" /><ellipse cx="89" cy="63" rx="3" ry="5" fill="#22263b" /><ellipse cx="72" cy="81" rx="4" ry="5" fill="#22263b" /></>
          : mood === 'satisfied' ? <><path d="M48 64 Q54 56 60 64 M83 64 Q89 56 95 64 M62 80 Q72 89 82 80" fill="none" /></>
            : <><path d="M48 63 L60 63 M83 63 L95 63 M65 82 L78 82" fill="none" /></>}
        <path d="M71 64 L68 72 L73 72" fill="none" strokeWidth="1.5" />
        <rect x="40" y="53" width="26" height="22" rx="8" fill="none" /><rect x="77" y="53" width="26" height="22" rx="8" fill="none" /><path d="M66 59 L77 59" />
        <path d="M47 113 L49 121 M92 113 L91 121" fill="none" />
        <rect x="80" y="100" width="17" height="10" rx="2" fill="#fffdf3" strokeWidth="1.5" />
      </g>
      {mood === 'noticed' && <text x="119" y="38" fill="#d7785b" fontSize="30" fontWeight="900" transform="rotate(10 119 38)">!</text>}
      {mood === 'asleep' && <text x="114" y="35" fill="#87878b" fontSize="15" fontWeight="700">…</text>}
      {mood === 'checking' && <circle cx="122" cy="33" r="6" fill="#edc766" className="thinking-dot" />}
      {mood === 'satisfied' && <path d="M115 30 L120 35 L130 22" fill="none" stroke="#478777" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  )
}

export function SemanticLab() {
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [record, setRecord] = useState<FormRecord>(() => ({ ...samples[0].record }))
  const recordRef = useRef(record)
  const [sampleId, setSampleId] = useState<string | undefined>(samples[0].id)
  const [result, setResult] = useState<ResultSnapshot>()
  const [batchResults, setBatchResults] = useState<SemanticResult[]>()
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set())
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [elapsed, setElapsed] = useState<number>()
  const [completed, setCompleted] = useState(false)
  const generation = useRef(0)
  const controller = useRef<AbortController | undefined>(undefined)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const staticErrors = validateStatic(record)
  const staticOkay = Object.keys(staticErrors).length === 0
  const resolved = Boolean(result && result.result.plan.nodes.every((node, index) => node.type === 'Ready' || acknowledged.has(nodeKey(node, index))))
  const mood: Mood = pending ? 'checking' : result ? resolved ? 'satisfied' : 'noticed' : 'asleep'

  const cancel = () => {
    generation.current += 1
    controller.current?.abort()
    controller.current = undefined
    busyRef.current = false
    setPending(false)
  }
  const invalidate = () => {
    cancel()
    setResult(undefined)
    setBatchResults(undefined)
    setAcknowledged(new Set())
    setError(undefined)
    setElapsed(undefined)
    setCompleted(false)
  }
  const changeRecord = (next: FormRecord, selected?: string) => {
    invalidate()
    recordRef.current = next
    setRecord(next)
    setSampleId(selected)
  }
  const edit = <K extends keyof FormRecord>(field: K, value: FormRecord[K]) => changeRecord({ ...recordRef.current, [field]: value })
  const selectSample = (next: FormRecord, selected?: string) => {
    changeRecord({ ...next }, selected)
    setMode('single')
  }
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; generation.current += 1; controller.current?.abort() }
  }, [])

  const check = async (force = false) => {
    if (busyRef.current) return
    if (!force && ((mode === 'single' && result) || (mode === 'batch' && batchResults))) return
    const records = mode === 'single' ? [{ ...recordRef.current }] : batchRecords.map((item) => ({ ...item }))
    if (records.some((item) => Object.keys(validateStatic(item)).length > 0)) return
    const run = ++generation.current
    const abort = new AbortController()
    controller.current = abort
    busyRef.current = true
    setPending(true)
    setError(undefined)
    setResult(undefined)
    setBatchResults(undefined)
    setAcknowledged(new Set())
    setCompleted(false)
    setElapsed(undefined)
    const started = performance.now()
    let timedOut = false
    let userError: string | undefined
    const failure = (message: string) => { userError = message; return new Error(message) }
    const timeout = setTimeout(() => { timedOut = true; abort.abort() }, 45000)
    try {
      const response = await fetch('/api/semantic', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ records }), signal: abort.signal,
      })
      let raw: unknown
      try { raw = await response.json() }
      catch { throw failure('結果を正しく受け取れませんでした。入力はそのままで、もう一度試せます。') }
      if (run !== generation.current || !mounted.current) return
      if (!response.ok) throw failure(isObject(raw) && typeof raw.error === 'string' ? raw.error : 'チェックを完了できませんでした。しばらく待ってから試してください。')
      const parsed = parseSemanticResponse(raw, records)
      if (!parsed) throw failure('判定に不足があるため、結果を表示できませんでした。もう一度試せます。')
      setElapsed(performance.now() - started)
      if (mode === 'single') setResult({ record: records[0], result: parsed.results[0] })
      else setBatchResults(parsed.results)
    } catch {
      if (run !== generation.current || !mounted.current) return
      setError(timedOut ? 'チェックに時間がかかっています。入力はそのままで、あとから試せます。' : userError ?? '通信できませんでした。接続を確認して、もう一度試してください。')
    } finally {
      clearTimeout(timeout)
      if (run === generation.current && mounted.current) { setPending(false); busyRef.current = false; controller.current = undefined }
    }
  }
  const acknowledge = (key: string) => setAcknowledged((previous) => new Set([...previous, key]))
  const batchById = new Map(batchResults?.map((item) => [item.id, item]))

  return (
    <main className="semantic-lab">
      <Container size="xl">
        <header className="semantic-nav"><a href="/" className="semantic-brand"><span className="semantic-brand-mark">J</span><strong>Jev</strong><span>気づくフォーム</span></a><a href="/theater" className="theater-link">あるある劇場 <span aria-hidden="true">↗</span></a></header>
        <section className="semantic-hero">
          <div><p className="semantic-eyebrow">入力の、その先まで。</p><h1>形式はOK。<span>でも、そこじゃない。</span></h1><p>名前と会社名が逆でも、文字列は文字列。<br className="semantic-mobile-break" />意味まで見たら、フォームはどこまで気が利く？</p></div>
          <div className="semantic-hero-note" aria-hidden="true">その入力、<br /><strong>ちょっと待った。</strong><span>気づく受付さん 在席中</span></div>
        </section>
        <div className="semantic-modebar"><SegmentedControl aria-label="チェックする件数" value={mode} onChange={(value) => { invalidate(); setMode(value as 'single' | 'batch') }} data={[{ label: '1件ずつ試す', value: 'single' }, { label: '8件まとめて受付', value: 'batch' }]} /><span>形を確認。意味に気づく。必要なUIだけ出す。</span></div>

        {mode === 'single' ? <>
          <nav className="sample-strip" aria-label="入力例を選ぶ">{samples.map((sample, index) => <button key={sample.id} className={sampleId === sample.id ? 'selected' : ''} aria-pressed={sampleId === sample.id} onClick={() => selectSample(sample.record, sample.id)} title={sample.teaser}><small>{String(index + 1).padStart(2, '0')}</small><span>{sample.label}</span></button>)}</nav>
          <div className="semantic-workspace">
            <section className="inquiry-panel" aria-labelledby="input-heading">
              <div className="panel-heading"><div><span className="section-number">01</span><h2 id="input-heading">まずは、いつものフォーム。</h2></div><Badge variant="light" color={staticOkay ? 'teal' : 'orange'}>{staticOkay ? '形式OK' : '形式を確認'}</Badge></div>
              <form onSubmit={(event) => event.preventDefault()}>
                <SimpleGrid cols={2} spacing="md"><TextInput label="お名前" value={record.name} maxLength={100} error={staticErrors.name} onChange={(event) => edit('name', event.currentTarget.value)} autoComplete="off" /><TextInput label="会社名・屋号" value={record.company} maxLength={100} error={staticErrors.company} onChange={(event) => edit('company', event.currentTarget.value)} autoComplete="off" /></SimpleGrid>
                <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" mt="md"><TextInput label="メールアドレス" value={record.email} maxLength={254} error={staticErrors.email} onChange={(event) => edit('email', event.currentTarget.value)} autoComplete="off" /><Select label="お問い合わせの種類" value={record.category} data={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))} allowDeselect={false} onChange={(value) => { if (value && Object.hasOwn(categoryLabels, value)) edit('category', value as Category) }} /></SimpleGrid>
                <Textarea label="お問い合わせ内容" value={record.message} maxLength={600} minRows={4} autosize mt="md" error={staticErrors.message} onChange={(event) => edit('message', event.currentTarget.value)} />
                <div className="form-meta"><span>会社名は屋号でもOK。法人格は必須ではありません。</span><span>{record.message.length} / 600</span></div>
              </form>
              <div className={`static-check ${staticOkay ? 'static-valid' : ''}`}><span aria-hidden="true">{staticOkay ? '✓' : '!'}</span><div><strong>形式チェック：{staticOkay ? '通りました' : '入力を見直してください'}</strong><p>必須入力・メールの形式・文字数を確認。中身の意味は、まだ別の話です。</p></div></div>
              <Group gap="sm"><Button color="dark" size="md" className="semantic-check-button" disabled={!staticOkay || pending || Boolean(result)} loading={pending} onClick={() => void check()}>{result ? '前回の結果を表示中' : 'Jevで意味をチェック'}<span aria-hidden="true"> ↗</span></Button>{pending && <Button variant="subtle" color="gray" onClick={cancel}>キャンセル</Button>}{result && <Button size="xs" variant="subtle" color="gray" onClick={() => void check(true)}>もう一度判定</Button>}</Group>
              <Text size="xs" c="dimmed" mt="xs">押したときだけ、4つの観点をまとめて確認します。</Text>
            </section>

            <section className="semantic-result-panel" aria-labelledby="result-heading" aria-live="polite">
              <div className="panel-heading"><div><span className="section-number">02</span><h2 id="result-heading">気づいたら、手を貸す。</h2></div>{elapsed !== undefined && <span className="semantic-time">実測 {(elapsed / 1000).toFixed(2)} 秒</span>}</div>
              <div className={`reception-desk ${result ? 'has-result' : ''}`}><Receptionist mood={mood} /><div className="reception-speech">{pending ? '中身を読んでいます。' : completed ? '受付できました。おつかれさまです。' : result ? resolved ? 'では、この内容で。' : 'あ、ひとつ確認しても？' : '意味はまだ見ていません。'}<small>{pending ? '名前・会社名・窓口・具体性を確認中' : result ? '修正するかどうかは、あなたにおまかせ。' : '文字が入っている。それだけでは、わからないことも。'}</small></div></div>
              {error && <Alert color="red" title="チェックできませんでした" mb="md">{error}</Alert>}
              {result ? <SemanticRenderer key={JSON.stringify(result.result.decision)} plan={result.result.plan} record={record} acknowledged={acknowledged} onAcknowledge={acknowledge} onSwap={() => changeRecord({ ...recordRef.current, name: recordRef.current.company, company: recordRef.current.name })} onCategory={(category) => edit('category', category)} onMessage={(message) => edit('message', message)} /> : !pending && !error ? <div className="meaning-placeholder"><span>例えば、こんな気づき。</span><div><i aria-hidden="true">↔</i> 名前と会社名、逆では？</div><div><i aria-hidden="true">↗</i> その内容なら、別の窓口かも。</div><div><i aria-hidden="true">＋</i> もう少し聞きたいときだけ、入力欄を。</div><small>これは機能の例です。今の入力の判定結果ではありません。</small></div> : null}
              {pending && <div className="semantic-pending" role="status"><span /><span /><span /><p>受付さんが意味を確認しています。</p></div>}
              {result && <div className="demo-submit"><Button color="teal" disabled={!resolved || !staticOkay || completed} fullWidth onClick={() => { if (resolved && staticOkay) setCompleted(true) }}>{completed ? 'デモ受付済み' : 'この内容で受付を体験'}</Button>{!resolved && <Text size="xs" c="dimmed" mt="xs">上の提案を確認すると、受付を体験できます。修正した場合は再チェックしてください。</Text>}</div>}
              {completed && <Alert color="teal" title="デモ受付完了" mt="md"><Text size="sm">外部送信・保存はしていません。</Text><dl className="confirmation-summary"><dt>お名前</dt><dd>{record.name}</dd><dt>会社名・屋号</dt><dd>{record.company}</dd><dt>窓口</dt><dd>{categoryLabels[record.category]}</dd><dt>内容</dt><dd>{record.message}</dd></dl></Alert>}
            </section>
          </div>
          <details className="semantic-internals"><summary>判断からUIになるまで <span>どうして、この入力欄が出たの？</span></summary><div className="render-pipeline"><span>Jevが意味を判定</span><b>→</b><span>決まったルールでUIを選択</span><b>→</b><span>Mantineで表示</span></div><p>同じ判定JSONなら同じUI。AIの意味判断自体は揺れることがあります。</p>{result ? <div className="json-pair"><div><h3>今回の判定JSON</h3><pre>{JSON.stringify(result.result.decision, null, 2)}</pre></div><div><h3>今回のUIプラン</h3><pre>{JSON.stringify(result.result.plan, null, 2)}</pre></div></div> : <Text size="sm" c="dimmed">チェックすると、実際の判定と、それから組み立てたUIプランを表示します。</Text>}<p>用意したコンポーネントだけを選んで表示します。AIが任意のHTMLやコードを実行する仕組みではありません。</p></details>
        </> : <section className="semantic-batch">
          <div className="batch-introduction"><div><p className="semantic-eyebrow">形式だけなら、全員通過。</p><h2>8件の「中身」を、いっぺんに。</h2><p>1回のリクエストで、8件 × 4つの観点を判断します。</p></div><div><Group><Button color="dark" size="md" loading={pending} disabled={pending || Boolean(batchResults)} onClick={() => void check()}>8件を一度にチェック</Button>{pending && <Button variant="subtle" color="gray" onClick={cancel}>キャンセル</Button>}{batchResults && <Button variant="subtle" color="gray" size="xs" onClick={() => void check(true)}>もう一度判定</Button>}</Group>{elapsed !== undefined && <p className="batch-timing">8件・32判断 / 通信込み実測 <strong>{(elapsed / 1000).toFixed(2)}秒</strong></p>}</div></div>
          {error && <Alert color="red" title="チェックできませんでした" mb="md">{error}</Alert>}
          <div className="batch-records">{batchRecords.map((item, index) => {
            const checked = batchById.get(item.id)
            return <article key={item.id} className={`batch-record ${checked ? 'batch-revealed' : ''}`} style={checked ? { animationDelay: `${index * 65}ms` } : undefined}>
              <div className="batch-record-header"><span className="batch-record-number">{String(index + 1).padStart(2, '0')}</span><Badge color="teal" variant="light">形式OK</Badge><span className="batch-meaning-status">{checked ? '意味を確認しました' : '意味は未確認'}</span></div>
              <h3>{item.name}<span> / {item.company}</span></h3><p className="batch-message">{item.message}</p><span className="batch-category">選択した窓口：{categoryLabels[item.category]}</span>
              {checked ? <ul className="batch-plan">{planSummary(checked.plan).map((summary, summaryIndex) => <li key={`${item.id}-${summaryIndex}`}>{summary}</li>)}</ul> : <div className="batch-waiting">{pending ? 'まとめて確認中…' : '中身を見ると、何か変わる？'}</div>}
              <Button variant="subtle" color="dark" size="xs" onClick={() => selectSample(item)}>この入力を試す →</Button>
            </article>
          })}</div>
          {batchResults && <p className="batch-measure-note">全結果が返ってから順に表示しています。表示アニメーションの時間は実測に含めません。</p>}
        </section>}
        <footer className="semantic-footer"><p>デモ用の入力例です。チェック時は入力内容をAIへ送信します。メールアドレスは意味判定に使いません。</p><p>AIは入力の意味を推測します。本人・会社の実在確認ではありません。利用制限に達した場合は、時間をおいて手動で再チェックできます。</p><span>JEV · LITTLE NOTICES, BETTER FORMS.</span></footer>
      </Container>
    </main>
  )
}
