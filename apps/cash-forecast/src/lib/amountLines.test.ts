import { describe, expect, it } from 'vitest'
import {
  createAmountLine,
  initAmountLines,
  initAmountLinesFromTx,
  sumAmountLines,
  toAmountBreakdown,
} from './amountLines'

describe('createAmountLine', () => {
  it('unique id を持つ。value / label 省略時は空', () => {
    const a = createAmountLine()
    const b = createAmountLine(500, '住民税')
    expect(a.id).not.toBe(b.id)
    expect(a.value).toBeUndefined()
    expect(a.label).toBe('')
    expect(b.value).toBe(500)
    expect(b.label).toBe('住民税')
  })
})

describe('sumAmountLines', () => {
  it('全て未入力なら undefined', () => {
    expect(sumAmountLines([createAmountLine(), createAmountLine()])).toBeUndefined()
  })

  it('1行だけならその値', () => {
    expect(sumAmountLines([createAmountLine(184000)])).toBe(184000)
  })

  it('複数行を合算し、空行は無視する', () => {
    const lines = [createAmountLine(50000), createAmountLine(), createAmountLine(30000)]
    expect(sumAmountLines(lines)).toBe(80000)
  })

  it('0 も合計に含める', () => {
    expect(sumAmountLines([createAmountLine(0), createAmountLine(100)])).toBe(100)
  })

  it('label は合算に影響しない', () => {
    expect(sumAmountLines([createAmountLine(100, 'A'), createAmountLine(200, 'B')])).toBe(300)
  })
})

describe('initAmountLines', () => {
  it('常に1行で初期化する', () => {
    const lines = initAmountLines(1234)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.value).toBe(1234)
    expect(lines[0]?.label).toBe('')
  })

  it('undefined でも1行', () => {
    const lines = initAmountLines(undefined)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.value).toBeUndefined()
  })
})

describe('initAmountLinesFromTx', () => {
  it('breakdown 無しなら amount の1行', () => {
    const lines = initAmountLinesFromTx({ amount: 184000 })
    expect(lines).toHaveLength(1)
    expect(lines[0]?.value).toBe(184000)
    expect(lines[0]?.label).toBe('')
  })

  it('空配列は breakdown 無し扱い', () => {
    const lines = initAmountLinesFromTx({ amount: 50, amountBreakdown: [] })
    expect(lines).toHaveLength(1)
    expect(lines[0]?.value).toBe(50)
  })

  it('breakdown があれば各行を復元（label 欠落は空文字）', () => {
    const lines = initAmountLinesFromTx({
      amount: 80000,
      amountBreakdown: [
        { amount: 50000, label: '住民税' },
        { amount: 30000 },
      ],
    })
    expect(lines).toHaveLength(2)
    expect(lines[0]?.value).toBe(50000)
    expect(lines[0]?.label).toBe('住民税')
    expect(lines[1]?.value).toBe(30000)
    expect(lines[1]?.label).toBe('')
  })
})

describe('toAmountBreakdown', () => {
  it('値の無い行だけなら undefined', () => {
    expect(toAmountBreakdown([createAmountLine(), createAmountLine(undefined, 'メモ')])).toBeUndefined()
  })

  it('単一・ラベル無しは undefined（スカラー amount で足りる）', () => {
    expect(toAmountBreakdown([createAmountLine(184000)])).toBeUndefined()
  })

  it('単一でもラベルがあれば配列を返す', () => {
    expect(toAmountBreakdown([createAmountLine(184000, ' 住民税 ')])).toEqual([
      { amount: 184000, label: '住民税' },
    ])
  })

  it('複数行はラベル無しでも配列。空ラベルは key を省略', () => {
    expect(
      toAmountBreakdown([
        createAmountLine(50000, '住民税'),
        createAmountLine(undefined, '無視'),
        createAmountLine(30000, '  '),
      ]),
    ).toEqual([{ amount: 50000, label: '住民税' }, { amount: 30000 }])
  })
})
