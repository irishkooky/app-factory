// 純粋関数・定数のみ。convex への依存なし。フロントエンドからも import される。

export const OPEN_MINUTES = 600 // 10:00
export const CLOSE_MINUTES = 1140 // 19:00
export const SLOT_STEP = 30
export const CLOSED_WEEKDAY = 2 // 火曜 (Date#getUTCDay() の 0=日, 1=月, 2=火...)
export const MAX_ADVANCE_DAYS = 30 // 予約は30日先まで
export const BOOKING_LEAD_MINUTES = 30 // 当日は現在時刻+30分以降のみ受付

export const MENU_CATEGORIES = [
  'カット',
  'カラー',
  'パーマ',
  'トリートメント',
  'ヘッドスパ',
  'セットメニュー',
] as const

export type MenuCategory = (typeof MENU_CATEGORIES)[number]

export const AVATAR_COLORS = ['orange', 'pink', 'grape', 'indigo', 'teal', 'cyan'] as const

export type AvatarColor = (typeof AVATAR_COLORS)[number]

/** 現在時刻をJST(UTC+9)に補正した Date を返す。以後 getUTC* 系で読むこと。 */
export function jstNow(): Date {
  return new Date(Date.now() + 9 * 3600 * 1000)
}

/** JSTの今日を YYYY-MM-DD で返す */
export function jstTodayString(): string {
  const now = jstNow()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** JSTの現在時刻を「その日の0時からの分数」で返す */
export function jstNowMinutes(): number {
  const now = jstNow()
  return now.getUTCHours() * 60 + now.getUTCMinutes()
}

/** date 文字列（YYYY-MM-DD）に days 日を加算した文字列を返す（UTC演算） */
export function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** date 文字列（YYYY-MM-DD）の曜日を返す（0=日, 1=月, ..., 6=土） */
export function weekdayOfDateString(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

/** YYYY-MM-DD 形式かつ実在する日付かどうかを検証する */
export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return false
  }
  const d = new Date(`${s}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) {
    return false
  }
  const [y, m, dd] = s.split('-').map(Number)
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === dd
}

/** 分数を "HH:MM" 形式にする。例: 600 -> "10:00" */
export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** 価格を日本円表記にする。例: 4400 -> "¥4,400" */
export function formatPrice(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`
}

/** 区間 [aStart, aEnd) と [bStart, bEnd) が重なっているかどうか */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}
