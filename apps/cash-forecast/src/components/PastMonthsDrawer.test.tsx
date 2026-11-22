import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Id } from '../../convex/_generated/dataModel'
import type { ForecastRow } from '../lib/forecast'
import type { HistoryRow } from '../lib/history'
import { PastMonthsDrawer, type PastMonthsNav } from './PastMonthsDrawer'

afterEach(cleanup)

function historyRow(date: string, name: string, kind: HistoryRow['kind'], amount: number, balance: number): HistoryRow {
  return { txId: `tx_${date}` as Id<'transactions'>, date, name, rawName: name, isAddon: false, kind, amount, balance }
}

function forecastRow(date: string, name: string, amount: number, balance: number, isVirtual: boolean): ForecastRow {
  return { key: `row_${date}`, date, name, kind: 'expense', amount, balance, isVirtual, belowThreshold: false }
}

const historyRows = [
  historyRow('2026-09-10', '給与', 'income', 1000, 1000),
  historyRow('2026-10-05', '家賃', 'expense', 300, 700),
]
const pastRows = [
  forecastRow('2026-11-03', '電気代', 200, 500, true),
  forecastRow('2026-11-10', '外食', 100, 400, false),
]

function Harness({
  onHistoryRowClick = () => {},
  onForecastRowClick = () => {},
}: {
  onHistoryRowClick?: (row: HistoryRow) => void
  onForecastRowClick?: (row: ForecastRow) => void
}) {
  const [nav, setNav] = useState<PastMonthsNav>({ screen: 'list' })
  return (
    <PastMonthsDrawer
      opened
      onClose={() => {}}
      nav={nav}
      onNavChange={setNav}
      historyRows={historyRows}
      pastRows={pastRows}
      today="2026-11-22"
      onHistoryRowClick={onHistoryRowClick}
      onForecastRowClick={onForecastRowClick}
    />
  )
}

const monthButtons = () => screen.getAllByRole('button', { name: /^\d{4}年\d{1,2}月/ })

describe('PastMonthsDrawer', () => {
  it('月一覧は新しい月から並び、件数と符号付きの収支を出す（未実績化の予測行も含む）', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: '過去の月' })).toBeTruthy()
    expect(monthButtons().map((b) => b.textContent)).toEqual([
      '2026年11月2件収支 -¥300',
      '2026年10月1件収支 -¥300',
      '2026年9月1件収支 +¥1,000',
    ])
  })

  it('月をタップするとその月の明細になり、確定行に印、見込みのまま過ぎた行は要確認、戻ると一覧', async () => {
    const user = userEvent.setup()
    const onForecastRowClick = vi.fn()
    render(<Harness onForecastRowClick={onForecastRowClick} />)

    await user.click(screen.getByRole('button', { name: /^2026年11月/ }))
    expect(screen.getByRole('heading', { name: '2026年11月' })).toBeTruthy()

    const virtualRow = screen.getByRole('button', { name: /電気代/ })
    expect(within(virtualRow).getByText('要確認')).toBeTruthy()
    expect(within(virtualRow).queryByRole('img', { name: '確定' })).toBeNull()
    const confirmedRow = screen.getByRole('button', { name: /外食/ })
    expect(within(confirmedRow).getByRole('img', { name: '確定' })).toBeTruthy()

    await user.click(confirmedRow)
    expect(onForecastRowClick).toHaveBeenCalledWith(pastRows[1])

    await user.click(screen.getByRole('button', { name: '過去の月に戻る' }))
    expect(screen.getByRole('heading', { name: '過去の月' })).toBeTruthy()
    expect(monthButtons()).toHaveLength(3)
  })

  it('実績の月は全行に確定の印が付き、タップで実績の編集へ渡す', async () => {
    const user = userEvent.setup()
    const onHistoryRowClick = vi.fn()
    render(<Harness onHistoryRowClick={onHistoryRowClick} />)

    await user.click(screen.getByRole('button', { name: /^2026年10月/ }))
    const row = screen.getByRole('button', { name: /家賃/ })
    expect(within(row).getByRole('img', { name: '確定' })).toBeTruthy()

    await user.click(row)
    expect(onHistoryRowClick).toHaveBeenCalledWith(historyRows[1])
  })
})
