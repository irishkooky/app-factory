// 日付ユーティリティ。すべて純粋関数。日付は "YYYY-MM-DD" 文字列（ゼロ埋め必須、比較は辞書順）。
// このアプリはSSRされる（Workers/ローカルNodeはUTC）ため、todayJST 以外で
// `new Date()` から暗黙にローカル日付を作らない。日付の分解・演算は文字列パース + 数値計算で行う。

const MONTH_LABELS_JA = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
] as const;

/** Asia/Tokyo における「今日」を "YYYY-MM-DD" で返す。 */
export function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

/** 指定した年月の日数。month は 1-12。うるう年対応。 */
export function daysInMonth(year: number, month: number): number {
  // day=0 は「前月の末日」を意味するため、month の翌月の0日目 = month の末日になる
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** day を year/month の日数にクランプする。 */
export function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function parseYearMonth(yyyyMm: string): { year: number; month: number } {
  const [yearStr, monthStr] = yyyyMm.split("-");
  return { year: Number(yearStr), month: Number(monthStr) };
}

function parseDate(yyyyMmDd: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = yyyyMmDd.split("-");
  return { year: Number(yearStr), month: Number(monthStr), day: Number(dayStr) };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM" に n ヶ月を加算した "YYYY-MM" を返す。 */
export function addMonths(yyyyMm: string, n: number): string {
  const { year, month } = parseYearMonth(yyyyMm);
  const totalMonths = year * 12 + (month - 1) + n;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${pad2(newMonth)}`;
}

/** "YYYY-MM-DD" に n ヶ月を加算する。日は加算後の月の日数にクランプする（例: 1/31 +1ヶ月 → 2/28）。 */
export function addMonthsToDateClamped(yyyyMmDd: string, n: number): string {
  const { year, month, day } = parseDate(yyyyMmDd);
  const nextYm = addMonths(`${year}-${pad2(month)}`, n);
  const { year: newYear, month: newMonth } = parseYearMonth(nextYm);
  const clampedDay = clampDay(newYear, newMonth, day);
  return `${newYear}-${pad2(newMonth)}-${pad2(clampedDay)}`;
}

/** "YYYY-MM-DD" から "YYYY-MM" を取り出す。 */
export function monthOf(yyyyMmDd: string): string {
  return yyyyMmDd.slice(0, 7);
}

/**
 * "YYYY-MM-DD" に n 日を加算する（暦の繰り上がりに対応）。
 * 与えられた日付文字列を数値分解して計算するだけの純粋関数で、
 * システム時刻（タイムゾーン）には依存しない。
 */
export function addDays(yyyyMmDd: string, n: number): string {
  const { year, month, day } = parseDate(yyyyMmDd);
  const utcMs = Date.UTC(year, month - 1, day + n);
  const d = new Date(utcMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** "YYYY-MM-DD" を "M/D" 表示に整形する。 */
export function formatDateShort(yyyyMmDd: string): string {
  const { month, day } = parseDate(yyyyMmDd);
  return `${month}/${day}`;
}

/** "YYYY-MM" を「2026年8月」表示に整形する。 */
export function formatMonthLabel(yyyyMm: string): string {
  const { year, month } = parseYearMonth(yyyyMm);
  return `${year}年${MONTH_LABELS_JA[month - 1]}`;
}
