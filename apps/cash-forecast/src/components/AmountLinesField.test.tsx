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
      <AmountLinesField lines={lines} onChange={setLines} />
      <span data-testid="total">{total === undefined ? 'none' : String(total)}</span>
      <span data-testid="line-count">{lines.length}</span>
      <span data-testid="labels">{lines.map((l) => l.label).join('|')}</span>
    </>
  )
}

describe('AmountLinesField', () => {
  it('項目を追加すると行が増え、複数金額の合計が表示される', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByTestId('line-count').textContent).toBe('1')

    await user.click(screen.getByRole('button', { name: '項目を追加' }))
    expect(screen.getByTestId('line-count').textContent).toBe('2')

    await user.type(screen.getByRole('textbox', { name: '金額' }), '50000')
    await user.type(screen.getByRole('textbox', { name: '金額 2' }), '30000')

    expect(screen.getByTestId('total').textContent).toBe('80000')
    expect(screen.getByText('合計')).toBeTruthy()
    expect(screen.getByText('¥80,000')).toBeTruthy()
    expect(screen.getByText('（この金額で保存）')).toBeTruthy()
  })

  it('編集初期値は1行で、削除ボタンは出ない。2行目を足すと削除できる', async () => {
    const user = userEvent.setup()
    render(<Harness initial={184000} />)
    expect(screen.getByRole('textbox', { name: '金額' })).toHaveProperty('value', '184000')
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()

    await user.click(screen.getByRole('button', { name: '項目を追加' }))
    expect(screen.getAllByRole('button', { name: '削除' })).toHaveLength(2)
  })

  it('各行に任意の項目名を入れられる', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox', { name: '項目名' }), '住民税')
    expect(screen.getByTestId('labels').textContent).toBe('住民税')

    await user.click(screen.getByRole('button', { name: '項目を追加' }))
    expect(screen.getByRole('textbox', { name: '項目名' })).toHaveProperty('value', '住民税')
    await user.type(screen.getByRole('textbox', { name: '項目名 2' }), '予定納税')
    expect(screen.getByTestId('labels').textContent).toBe('住民税|予定納税')
  })

  it('hydrate 済みの項目名を表示する', () => {
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
    expect(screen.getByRole('textbox', { name: '項目名' })).toHaveProperty('value', '住民税')
    expect(screen.getByRole('textbox', { name: '項目名 2' })).toHaveProperty('value', '予定納税')
  })
})
