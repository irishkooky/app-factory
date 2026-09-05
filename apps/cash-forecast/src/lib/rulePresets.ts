export type RulePreset = {
  id: 'salary' | 'rent' | 'card' | 'other'
  /** ボタンの文言（動詞形） */
  label: string
  /** ボタン下の補足 */
  hint: string
  /** フォームの初期値。name が空文字ならユーザーに入力させる */
  name: string
  kind: 'income' | 'expense'
  dayOfMonth: number
}

export const RULE_PRESETS: readonly RulePreset[] = [
  { id: 'salary', label: '給与を入力する', hint: '毎月の手取り額と振込日', name: '給与', kind: 'income', dayOfMonth: 25 },
  { id: 'rent', label: '家賃を入力する', hint: '家賃・住宅ローンの引き落とし', name: '家賃', kind: 'expense', dayOfMonth: 27 },
  {
    id: 'card',
    label: 'クレカの平均を入力する',
    hint: '毎月の平均的な請求額（締め日を入れると利用期間も表示）',
    name: 'クレジットカード',
    kind: 'expense',
    dayOfMonth: 27,
  },
  { id: 'other', label: 'その他の毎月の予定を入力する', hint: '光熱費・サブスク・保険など', name: '', kind: 'expense', dayOfMonth: 27 },
]
