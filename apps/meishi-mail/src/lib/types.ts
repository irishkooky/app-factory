/** 名刺から読み取った相手の情報。どのフィールドも読めなければ空文字・空配列 */
export interface CardInfo {
  name: string
  company: string
  department: string
  title: string
  emails: string[]
  phones: string[]
  website: string
  address: string
}

/** 送信者（アプリを使う自分）の情報。localStorage に保存する */
export interface SenderProfile {
  name: string
  company: string
  signature: string
  eventName: string
}

export interface MailDraft {
  subject: string
  body: string
}

export interface HistoryEntry {
  id: string
  createdAt: number
  card: CardInfo
  to: string
  draft: MailDraft
  /** Gmail / メールアプリで開いたか */
  opened: boolean
}

export const EMPTY_CARD: CardInfo = {
  name: '',
  company: '',
  department: '',
  title: '',
  emails: [],
  phones: [],
  website: '',
  address: '',
}
