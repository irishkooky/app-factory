import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  initAmountLines,
  initAmountLinesFromTx,
  sumAmountLines,
  type AmountLine,
} from '../lib/amountLines'
import { AmountLinesField } from './AmountLinesField'

afterEach(cleanup)

function Harness({
  initial,
  initialLines,
}: {
  initial?: number
  initialLines?: AmountLine[]
}) {
  const [lines, setLines] = useState<AmountLine[]>(
    () => initialLines ?? initAmountLines(initial),
  )
  const total = sumAmountLines(lines)
  return (
    <>
      <AmountLinesField lines={lines} onChange={setLines} kind="expense" />
      <span data-testid="total">{total === undefined ? 'none' : String(total)}</span>
      <span data-testid="line-count">{lines.length}</span>
      <span data-testid="labels">{lines.map((l) => l.label).join('|')}</span>
    </>
  )
}

describe('AmountLinesField', () => {
  it('項目が無いうちは金額1つの入力欄で、合計や編集ボタンは出ない', () => {
    render(<Harness initial={184000} />)
    expect(screen.getByRole('textbox', { name: '金額' })).toHaveProperty('value', '184000')
    expect(screen.queryByText('合計')).toBeNull()
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })

  it('項目を追加すると、既存の金額が1行目になり、新しい行が編集状態で開く', async () => {
    const user = userEvent.setup()
    render(<Harness initial={50000} />)

    await user.click(screen.getByRole('button', { name: '＋項目を追加' }))
    expect(screen.getByTestId('line-count').textContent).toBe('2')
    expect(screen.getByText('項目1')).toBeTruthy()
    // 合計と1行目の両方に出る
    expect(screen.getAllByText('-¥50,000')).toHaveLength(2)

    await user.type(screen.getByRole('textbox', { name: '項目名 2' }), '予定納税')
    await user.type(screen.getByRole('textbox', { name: '金額 2' }), '30000')
    await user.click(screen.getByRole('button', { name: '完了' }))

    expect(screen.getByTestId('total').textContent).toBe('80000')
    expect(screen.getByText('合計')).toBeTruthy()
    expect(screen.getByText('-¥80,000')).toBeTruthy()
    expect(screen.getByText('予定納税')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: '金額 2' })).toBeNull()
  })

  it('行の編集ボタンでその行だけ開き、項目名を付けられる', async () => {
    const user = userEvent.setup()
    render(<Harness initial={50000} />)
    await user.click(screen.getByRole('button', { name: '＋項目を追加' }))
    await user.click(screen.getByRole('button', { name: '完了' }))

    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.type(screen.getByRole('textbox', { name: '項目名' }), '住民税')
    expect(screen.getByTestId('labels').textContent).toBe('住民税|')
    expect(screen.queryByRole('textbox', { name: '項目名 2' })).toBeNull()
  })

  it('削除で行が減り、ラベル無しの1行に戻ると単一の入力欄に戻る', async () => {
    const user = userEvent.setup()
    render(<Harness initial={50000} />)
    await user.click(screen.getByRole('button', { name: '＋項目を追加' }))
    await user.click(screen.getByRole('button', { name: '完了' }))

    await user.click(screen.getByRole('button', { name: '削除 2' }))
    expect(screen.getByTestId('line-count').textContent).toBe('1')
    expect(screen.getByRole('textbox', { name: '金額' })).toHaveProperty('value', '50000')
  })

  it('hydrate 済みの項目名と金額を一覧で表示する', () => {
    render(
      <Harness
        initialLines={initAmountLinesFromTx({
          amount: 80000,
          amountBreakdown: [
            { amount: 50000, label: '住民税' },
            { amount: 30000, label: '予定納税' },
          ],
        })}
      />,
    )
    expect(screen.getByText('住民税')).toBeTruthy()
    expect(screen.getByText('予定納税')).toBeTruthy()
    expect(screen.getByText('-¥80,000')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^編集/ })).toHaveLength(2)
  })
})
