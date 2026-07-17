// クライアント（ブラウザ）の現地時刻を扱うためのヘルパー。
// toISOString() はUTCになるため使わず、Dateのローカルgetter（getFullYear/getMonth/getDate等）で組み立てる。
// このリポジトリの利用想定はJST圏内のため、ブラウザの現地時刻＝JSTとして扱う。

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/** Date を YYYY-MM-DD 文字列にする（ローカル時刻基準） */
export function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** クライアントの現地時刻での「今日」を YYYY-MM-DD で返す */
export function todayDateString(): string {
  return localDateString(new Date())
}

/** YYYY-MM-DD 文字列をローカル時刻の Date（00:00）としてパースする */
export function parseLocalDateString(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

/** date 文字列に days 日を加算した文字列を返す（ローカル時刻基準） */
export function addDaysToLocalDateString(date: string, days: number): string {
  const d = parseLocalDateString(date)
  d.setDate(d.getDate() + days)
  return localDateString(d)
}

/** date 文字列の曜日インデックス（0=日, 1=月, ..., 6=土）を返す */
export function weekdayIndexOfDateString(date: string): number {
  return parseLocalDateString(date).getDay()
}

/** "7/17(金)" のような表示用ラベルを作る */
export function formatDateChipLabel(date: string): string {
  const d = parseLocalDateString(date)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[d.getDay()]})`
}
