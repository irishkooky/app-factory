import { useMemo } from 'react'
import { Chip, Separator } from '@heroui/react'
import type { ForecastRow } from '../lib/forecast'
import { formatDateShort, formatMonthLabel, monthOf } from '../lib/date'
import { formatYen } from '../lib/money'
import { summarizeByMonth, type MonthSummary } from '../lib/summary'

type ForecastListProps = {
  rows: ForecastRow[]
  today: string
  onRowClick: (row: ForecastRow) => void
}

type ListItem =
  | { type: 'month'; key: string; month: string }
  | { type: 'today'; key: string }
  | { type: 'row'; key: string; row: ForecastRow }

function buildItems(rows: ForecastRow[], today: string): ListItem[] {
  const items: ListItem[] = []
  let currentMonth: string | null = null
  let todayInserted = false

  for (const row of rows) {
    const month = monthOf(row.date)
    if (month !== currentMonth) {
      items.push({ type: 'month', key: `month-${month}`, month })
      currentMonth = month
    }
    if (!todayInserted && row.date > today) {
      items.push({ type: 'today', key: 'today' })
      todayInserted = true
    }
    items.push({ type: 'row', key: row.key, row })
  }

  if (!todayInserted) {
    items.push({ type: 'today', key: 'today' })
  }

  return items
}

export function ForecastList({ rows, today, onRowClick }: ForecastListProps) {
  const items = buildItems(rows, today)
  const monthSummaries = useMemo(() => {
    const map = new Map<string, MonthSummary>()
    for (const summary of summarizeByMonth(rows)) {
      map.set(summary.month, summary)
    }
    return map
  }, [rows])

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted">
        表示できる予定がありません。ルールや取引を追加してください。
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        if (item.type === 'month') {
          const summary = monthSummaries.get(item.month)
          return (
            <div key={item.key} className="mt-4 mb-1.5 flex items-center gap-2">
              <MonthDividerLabel month={item.month} summary={summary} />
              <Separator className="flex-1" />
            </div>
          )
        }
        if (item.type === 'today') {
          return (
            <div key={item.key} className="my-1.5 flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-sm text-accent">今日</span>
              <Separator className="flex-1" />
            </div>
          )
        }
        return <ForecastListRow key={item.key} row={item.row} onClick={() => onRowClick(item.row)} />
      })}
    </div>
  )
}

function MonthDividerLabel({ month, summary }: { month: string; summary: MonthSummary | undefined }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="text-sm font-medium">{formatMonthLabel(month)}</span>
      {summary && (
        <span className={`text-sm tabular-nums ${summary.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
          収支 {summary.net >= 0 ? '+' : ''}
          {formatYen(summary.net)}
        </span>
      )}
    </div>
  )
}

function ForecastListRow({ row, onClick }: { row: ForecastRow; onClick: () => void }) {
  const amountColor = row.kind === 'expense' ? 'text-red-600' : 'text-blue-600'
  const amountSign = row.kind === 'expense' ? '-' : '+'
  const balanceColor = row.balance < 0 ? 'text-red-600' : undefined
  const isConfirmed = !row.isVirtual && row.ruleId !== undefined
  const addonCount = row.addons?.length ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-left ${row.belowThreshold ? 'bg-warning-soft' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="w-10 shrink-0 text-sm text-muted">{formatDateShort(row.date)}</span>
          <div className="flex min-w-0 flex-col gap-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm">{row.name}</span>
              {row.isVirtual && (
                <Chip size="sm" variant="soft" className="shrink-0">
                  予定
                </Chip>
              )}
              {isConfirmed && (
                <Chip size="sm" variant="soft" color="success" className="shrink-0">
                  確定
                </Chip>
              )}
            </div>
            {addonCount > 0 && <span className="text-xs text-muted">上乗せ {addonCount}件</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0">
          <span className={`text-sm tabular-nums ${amountColor}`}>
            {amountSign}
            {formatYen(row.amount)}
          </span>
          <span className={`text-xs tabular-nums ${balanceColor ?? ''}`}>{formatYen(row.balance)}</span>
        </div>
      </div>
    </button>
  )
}
