import { createServerFn } from '@tanstack/react-start'
import { recipientLabel, subjectLine } from '../lib/template'
import type { CardInfo, MailDraft, SenderProfile } from '../lib/types'
import { generateJson } from './gemini'

const FIELD_MAX = 500
const MEMO_MAX = 1000

interface DraftInput {
  card: CardInfo
  sender: SenderProfile
  memo: string
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    subject: { type: 'STRING' },
    body: { type: 'STRING' },
  },
  required: ['subject', 'body'],
}

function text(value: unknown, max = FIELD_MAX): string {
  if (typeof value !== 'string') return ''
  return value.slice(0, max)
}

function validateDraftInput(data: DraftInput): DraftInput {
  const input: unknown = data
  if (!input || typeof input !== 'object') throw new Error('不正なリクエストです')
  const r = input as Record<string, unknown>
  const c = (r.card && typeof r.card === 'object' ? r.card : {}) as Record<string, unknown>
  const s = (r.sender && typeof r.sender === 'object' ? r.sender : {}) as Record<string, unknown>
  return {
    card: {
      name: text(c.name),
      company: text(c.company),
      department: text(c.department),
      title: text(c.title),
      emails: [],
      phones: [],
      website: text(c.website),
      address: '',
    },
    sender: {
      name: text(s.name),
      company: text(s.company),
      signature: text(s.signature),
      eventName: text(s.eventName),
      includeSignature: s.includeSignature !== false,
    },
    memo: text(r.memo, MEMO_MAX),
  }
}

function buildPrompt({ card, sender, memo }: DraftInput): string {
  return `名刺交換した相手に送る、お礼メールの本文を日本語で書いてください。

# 状況
- 場: ${sender.eventName || '交流会'}（今日）
- 相手: ${[card.company, card.department, card.title, card.name].filter(Boolean).join(' / ') || '不明'}
- 相手のWebサイト: ${card.website || '不明'}
- 自分: ${[sender.company, sender.name].filter(Boolean).join(' ') || '（名乗りは省略）'}
- 話した内容のメモ: ${memo || '（なし）'}

# 書き方
- 宛名・署名は書かない（別途付ける）。本文は「本日は〜」から始め、続けて自分の会社名と名前を一文で名乗る
- 2〜4段落に分け、段落の間は空行（改行2つ）を入れる。1段落は2〜3文まで
- 全体で200〜350字程度。ビジネスとして丁寧だが、堅すぎず温かみのある文面
- メモは自分（送信者）が書いた走り書き。主語が曖昧なときは、誰の話か断定せず「〜のお話」「〜の件」のように中立に触れる。相手の実績や行動として書くのはメモから明らかな場合だけ
- メモの約束ごと（ランチ・打ち合わせ等）があれば触れ、次につながる一言を自然に入れる
- メモに無い事実（相手の事業内容の断定、新たな約束など）をでっち上げない
- 最後は「今後ともどうぞよろしくお願いいたします。」で締める
- subject は30字以内。「【御礼】」で始める`
}

export const writeDraft = createServerFn({ method: 'POST' })
  .inputValidator(validateDraftInput)
  .handler(async ({ data }): Promise<MailDraft> => {
    const raw = await generateJson([{ text: buildPrompt(data) }], SCHEMA)
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const aiBody = text(r.body, 4000).trim()
    if (!aiBody) throw new Error('AI の文面が空でした')
    const body = [recipientLabel(data.card), '', aiBody].join('\n').trim()
    return { subject: text(r.subject, 100).trim() || subjectLine(data.sender), body }
  })
