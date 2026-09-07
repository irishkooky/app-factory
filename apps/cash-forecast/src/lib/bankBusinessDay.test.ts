import { describe, expect, it } from 'vitest'
import { nextBankBusinessDay } from './bankBusinessDay'

describe('nextBankBusinessDay', () => {
  it('土日と公表済みの祝日を越えて翌営業日にする', () => {
    expect(nextBankBusinessDay('2026-09-20')).toEqual({ date: '2026-09-24', adjusted: true, holidayUnconfirmed: false })
  })
  it('年末年始を越える', () => {
    expect(nextBankBusinessDay('2026-12-31').date).toBe('2027-01-04')
  })
  it('公表範囲外は週末等だけ補正し確認を求める', () => {
    expect(nextBankBusinessDay('2028-01-01')).toEqual({ date: '2028-01-04', adjusted: true, holidayUnconfirmed: true })
    expect(nextBankBusinessDay('2025-01-01').holidayUnconfirmed).toBe(true)
    expect(nextBankBusinessDay('2027-12-31')).toEqual({ date: '2028-01-04', adjusted: true, holidayUnconfirmed: true })
  })
})
