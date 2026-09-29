import type { CardInfo, MailDraft, SenderProfile } from './types'

export function recipientLabel(card: CardInfo): string {
  const lines: string[] = []
  const org = [card.company, card.department].filter(Boolean).join(' ')
  if (org) lines.push(org)
  lines.push(card.name ? `${card.name} 様` : 'ご担当者様')
  return lines.join('\n')
}

export function signatureBlock(sender: SenderProfile): string {
  if (sender.signature.trim()) return sender.signature.trim()
  const lines = ['――――――――――――', sender.company, sender.name].filter((l) => l.trim() !== '')
  return lines.length > 1 ? lines.join('\n') : ''
}

export function subjectLine(sender: SenderProfile): string {
  const event = sender.eventName.trim() || '交流会'
  const who = [sender.company, sender.name].filter(Boolean).join(' ')
  return `【御礼】本日の${event}でのご挨拶${who ? `（${who}）` : ''}`
}

/** AI を使わない既定の下書き。読み取り直後に即表示する */
export function buildTemplateDraft(card: CardInfo, sender: SenderProfile, memo: string): MailDraft {
  const event = sender.eventName.trim() || '交流会'
  const self = [sender.company ? `${sender.company}の` : '', sender.name || ''].join('')
  const memoLine = memo.trim()
    ? `\n${memo.trim()}のお話、大変興味深く伺いました。\n`
    : ''

  const body = [
    recipientLabel(card),
    '',
    `本日は${event}にてご挨拶させていただき、ありがとうございました。`,
    self ? `${self}です。` : '',
    memoLine,
    'せっかくのご縁ですので、今後ともお力添えいただけましたら幸いです。',
    'また改めてゆっくりお話しできる機会をいただけますと嬉しいです。',
    '',
    '今後ともどうぞよろしくお願いいたします。',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')
    .trim()

  return { subject: subjectLine(sender), body }
}

/** 送信・コピー用の本文。署名を付ける設定なら末尾に足す */
export function withSignature(draft: MailDraft, sender: SenderProfile): MailDraft {
  const signature = sender.includeSignature ? signatureBlock(sender) : ''
  return signature ? { ...draft, body: `${draft.body.trimEnd()}\n\n${signature}` } : draft
}
