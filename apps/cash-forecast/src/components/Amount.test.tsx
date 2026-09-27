import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { KindYen, NetYen, kindTone, netTone } from './Amount'

afterEach(cleanup)

const textNodes = (container: HTMLElement) => [...container.childNodes].map((node) => node.textContent)

describe('NetYen / KindYen', () => {
  it('収支は 0 以上に + を付け、負数は formatYen の - のまま', () => {
    expect(textNodes(render(<NetYen value={1234} />).container)).toEqual(['+', '¥1,234'])
    expect(render(<NetYen value={0} />).container.textContent).toBe('+¥0')
    expect(render(<NetYen value={-1234} />).container.textContent).toBe('-¥1,234')
  })

  it('入出金は種別で記号が決まるので支出の 0 円も -', () => {
    expect(textNodes(render(<KindYen kind="expense" amount={0} />).container)).toEqual(['-', '¥0'])
    expect(render(<KindYen kind="income" amount={5000} />).container.textContent).toBe('+¥5,000')
  })

  it('記号と金額は別テキストノード（1文字列にすると + と ¥ の間にカーニングが効き描画がずれる）', () => {
    expect(render(<NetYen value={185000} />).container.childNodes).toHaveLength(2)
    expect(render(<KindYen kind="income" amount={185000} />).container.childNodes).toHaveLength(2)
  })

  it('色は入り（0 以上・収入）が青、出（負・支出）が赤', () => {
    expect([netTone(0), netTone(-1), kindTone('income'), kindTone('expense')]).toEqual([
      'text-blue-600',
      'text-red-600',
      'text-blue-600',
      'text-red-600',
    ])
  })
})
