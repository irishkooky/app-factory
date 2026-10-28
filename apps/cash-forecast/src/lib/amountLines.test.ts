import { describe, expect, it } from 'vitest'
import { createAmountLine, initAmountLines, sumAmountLines } from './amountLines'

describe('createAmountLine', () => {
  it('unique id を持つ。value 省略時は undefined', () => {
    const a = createAmountLine()
    const b = createAmountLine(500)
    expect(a.id).not.toBe(b.id)
    expect(a.value).toBeUndefined()
    expect(b.value).toBe(500)
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
})

describe('initAmountLines', () => {
  it('常に1行で初期化する', () => {
    const lines = initAmountLines(1234)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.value).toBe(1234)
  })

  it('undefined でも1行', () => {
    const lines = initAmountLines(undefined)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.value).toBeUndefined()
  })
})
