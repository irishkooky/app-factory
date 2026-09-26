import { useState } from 'react'
import { Alert, Badge, Button, Group, Text, TextInput } from '@mantine/core'
import { categoryLabels, type Category, type FormRecord, type UiNode, type UiPlan } from '../lib/semantic'

type RendererProps = {
  plan: UiPlan
  record: FormRecord
  acknowledged: Set<string>
  onAcknowledge: (key: string) => void
  onSwap: () => void
  onCategory: (category: Category) => void
  onMessage: (message: string) => void
}

export const nodeKey = (node: UiNode, index: number) => `${node.type}-${index}`
const checkLabels = { identity: '名前と会社名の組み合わせ', company: '会社名・屋号', intent: '問い合わせの窓口', detail: '問い合わせの具体性' }

export function planSummary(plan: UiPlan): string[] {
  return plan.nodes.map((node) => {
    switch (node.type) {
      case 'SwapFields': return '名前と会社名の入れ替えを提案'
      case 'ConfirmCompany': return '会社名・屋号を本人に確認'
      case 'SuggestCategory': return `${categoryLabels[node.category]}の窓口を提案`
      case 'AskDetails': return 'もう少し詳しく聞く欄を表示'
      case 'NeedsReview': return '決めつけず、本人に確認'
      case 'Ready': return '大きな食い違いは見つかりませんでした'
    }
  })
}

function DetailFields({ intent, message, onMessage }: {
  intent: Category | 'unclear'; message: string; onMessage: (value: string) => void
}) {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [error, setError] = useState<string>()
  const fields = intent === 'billing'
    ? ['確認してほしいこと', '注文番号（任意）']
    : intent === 'support'
      ? ['起きていること', '試したこと（任意）']
      : ['やりたいこと', '困っていること（任意）']
  const add = () => {
    if (!first.trim()) { setError('まず、確認してほしい内容をひとつ教えてください。'); return }
    const addition = [`${fields[0]}：${first.trim()}`, ...(second.trim() ? [`${fields[1].replace('（任意）', '')}：${second.trim()}`] : [])]
    const next = `${message.trim()}\n${addition.join('\n')}`
    if (next.length > 600) { setError(`追加すると${next.length}文字になります。全体で600文字以内にしてください。`); return }
    onMessage(next)
  }
  return (
    <div className="adaptive-fields">
      <TextInput label={fields[0]} value={first} maxLength={600} onChange={(event) => { setFirst(event.currentTarget.value); setError(undefined) }} />
      <TextInput label={fields[1]} value={second} maxLength={300} onChange={(event) => { setSecond(event.currentTarget.value); setError(undefined) }} />
      {error && <Text size="xs" c="red" role="alert">{error}</Text>}
      <Button variant="default" size="xs" onClick={add}>問い合わせ文に追加</Button>
    </div>
  )
}

export function SemanticRenderer({ plan, record, acknowledged, onAcknowledge, onSwap, onCategory, onMessage }: RendererProps) {
  return (
    <div className="adaptive-cards">
      {plan.nodes.map((node, index) => {
        const key = nodeKey(node, index)
        const accepted = acknowledged.has(key)
        if (node.type === 'Ready') return (
          <article className="adaptive-card ready-card" key={key}>
            <span className="adaptive-icon" aria-hidden="true">✓</span>
            <h3>受付さん、うなずきました。</h3>
            <p>大きな食い違いは見つかりませんでした。</p>
            <Text size="xs" c="dimmed">名前や会社の実在を確認した結果ではありません。</Text>
          </article>
        )
        if (accepted) return (
          <article className="adaptive-card acknowledged-card" key={key}>
            <Badge color="teal" variant="light">ご本人が確認しました</Badge>
            <p>{planSummary({ version: 1, nodes: [node] })[0]}</p>
            <Text size="xs" c="dimmed">入力はそのまま。AIの判定を変更したわけではありません。</Text>
          </article>
        )
        return (
          <article className={`adaptive-card node-${node.type}`} key={key}>
            <span className="adaptive-icon" aria-hidden="true">{node.type === 'NeedsReview' ? '?' : '!'}</span>
            {node.type === 'SwapFields' && <>
              <h3>お名前と会社名、席が逆かも。</h3>
              <p>中身を見ると、こちらの並びが自然そうです。</p>
              <div className="swap-preview">
                <div><small>お名前</small><del>{record.name}</del><span aria-hidden="true">↓</span><strong>{record.company}</strong></div>
                <div><small>会社名・屋号</small><del>{record.company}</del><span aria-hidden="true">↓</span><strong>{record.name}</strong></div>
              </div>
              <Button size="sm" color="dark" onClick={onSwap}>名前と会社名を入れ替える</Button>
            </>}
            {node.type === 'ConfirmCompany' && <>
              <h3>会社名というより、お名前に見えます。</h3>
              <p>「{record.company}」が屋号なら、このままでOK。法人格がなくても大丈夫です。</p>
              <Button size="sm" color="dark" onClick={() => onAcknowledge(key)}>この会社名で合っています</Button>
            </>}
            {node.type === 'SuggestCategory' && <>
              <h3>その相談、こちらの窓口かもしれません。</h3>
              <div className="category-preview"><span>{categoryLabels[record.category]}</span><span aria-hidden="true">→</span><strong>{categoryLabels[node.category]}</strong></div>
              <Button size="sm" color="dark" onClick={() => onCategory(node.category)}>{categoryLabels[node.category]}に変更する</Button>
            </>}
            {node.type === 'AskDetails' && <>
              <h3>「いい感じ」の解像度、もう少しだけ。</h3>
              <p>次の一歩がわかる情報を、ひとつ足してみませんか。</p>
              <DetailFields intent={node.intent} message={record.message} onMessage={onMessage} />
            </>}
            {node.type === 'NeedsReview' && <>
              <h3>ここは決めつけず、ご本人に。</h3>
              <p>この入力だけでは、はっきり判断できませんでした。</p>
              <ul>{node.checks.map((check) => <li key={check}>{checkLabels[check]}</li>)}</ul>
            </>}
            {node.type !== 'ConfirmCompany' && <Group mt="sm"><Button size="xs" color="gray" variant="subtle" onClick={() => onAcknowledge(key)}>入力はこのままで合っています</Button></Group>}
          </article>
        )
      })}
      {plan.nodes.some((node) => node.type !== 'Ready') && <Alert variant="light" color="gray" className="advisory-note">提案です。修正するか、このまま進むかは、あなたが選べます。</Alert>}
    </div>
  )
}
