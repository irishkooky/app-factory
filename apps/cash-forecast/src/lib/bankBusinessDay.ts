// 出典: 内閣府「国民の祝日」CSV（2026-09-07取得、2027年末まで公表）
// https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv
const HOLIDAYS = new Set([
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20','2026-04-29',
  '2026-05-03','2026-05-04','2026-05-05','2026-05-06','2026-07-20','2026-08-11',
  '2026-09-21','2026-09-22','2026-09-23','2026-10-12','2026-11-03','2026-11-23',
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23','2027-03-21','2027-03-22',
  '2027-04-29','2027-05-03','2027-05-04','2027-05-05','2027-07-19','2027-08-11',
  '2027-09-20','2027-09-23','2027-10-11','2027-11-03','2027-11-23',
])

const toIso = (date: Date) => date.toISOString().slice(0, 10)
const fromIso = (iso: string) => new Date(`${iso}T00:00:00Z`)

export type BusinessDayResult = { date: string; adjusted: boolean; holidayUnconfirmed: boolean }

export function nextBankBusinessDay(sourceDate: string): BusinessDayResult {
  let date = fromIso(sourceDate)
  if (Number.isNaN(date.getTime()) || toIso(date) !== sourceDate) throw new Error(`不正な日付です: ${sourceDate}`)
  let holidayUnconfirmed = date.getUTCFullYear() < 2026 || date.getUTCFullYear() > 2027
  let adjusted = false
  for (let guard = 0; guard < 14; guard += 1) {
    const iso = toIso(date)
    const day = date.getUTCDay()
    const yearEnd = /-(12-31|01-0[1-3])$/.test(iso)
    if (date.getUTCFullYear() < 2026 || date.getUTCFullYear() > 2027) holidayUnconfirmed = true
    const officialHoliday = HOLIDAYS.has(iso)
    if (day !== 0 && day !== 6 && !yearEnd && !officialHoliday) return { date: iso, adjusted, holidayUnconfirmed }
    date = new Date(date.getTime() + 86_400_000)
    adjusted = true
  }
  throw new Error('翌営業日を判定できませんでした。')
}

export function applyBankBusinessDays<T extends { sourceDate: string; date: string }>(rows: T[]): Array<T & { holidayUnconfirmed: boolean }> {
  return rows.map((row) => {
    const result = nextBankBusinessDay(row.sourceDate)
    return { ...row, date: result.date, holidayUnconfirmed: result.holidayUnconfirmed }
  })
}
