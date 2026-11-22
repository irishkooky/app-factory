import { useMemo, useState } from 'react'
import { Button, Drawer } from '@heroui/react'
import { IconCheck, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import type { HistoryRow } from '../lib/history'
import { formatDateShort, formatMonthLabel, monthOf } from '../lib/date'
import { summarizeByMonth } from '../lib/summary'
import { KindYen, NetYen, kindTone, netTone } from './Amount'
import { formatYen } from '../lib/money'

type PastMonthsDrawerProps = {
  opened: boolean
  onClose: () => void
  historyRows: HistoryRow[]
  today: string
  onHistoryRowClick?: (row: HistoryRow) => void
}

export function PastMonthsDrawer({
  opened,
  onClose,
  historyRows,
  today,
  onHistoryRowClick,
}: PastMonthsDrawerProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const currentMonth = monthOf(today)

  const monthGroups = useMemo(() => {
    const pastRows = historyRows.filter((row) => monthOf(row.date) < currentMonth)
    const rowsByMonth = new Map<string, HistoryRow[]>()
    for (const row of pastRows) {
      const month = monthOf(row.date)
      const monthRows = rowsByMonth.get(month)
      if (monthRows) monthRows.push(row)
      else rowsByMonth.set(month, [row])
    }
    // 新しい月を上に（一覧を遡りやすく）
    return summarizeByMonth(pastRows)
      .map((summary) => ({ summary, rows: rowsByMonth.get(summary.month) ?? [] }))
      .reverse()
  }, [historyRows, currentMonth])

  const selectedGroup = selectedMonth
    ? monthGroups.find((group) => group.summary.month === selectedMonth)
    : undefined

  const handleClose = () => {
    setSelectedMonth(null)
    onClose()
  }

  return (
    <Drawer.Backdrop
      isOpen={opened}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>
              {selectedGroup ? formatMonthLabel(selectedGroup.summary.month) : '過去の月'}
            </Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {selectedGroup ? (
              <MonthDetail
                rows={selectedGroup.rows}
                net={selectedGroup.summary.net}
                onBack={() => setSelectedMonth(null)}
                onRowClick={onHistoryRowClick}
              />
            ) : (
              <MonthList
                groups={monthGroups}
                onSelect={(month) => setSelectedMonth(month)}
              />
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function MonthList({
  groups,
  onSelect,
}: {
  groups: Array<{ summary: { month: string; net: number }; rows: HistoryRow[] }>
  onSelect: (month: string) => void
}) {
  if (groups.length === 0) {
    return <p className="py-8 text-center text-muted">まだ過去の月はありません。</p>
  }

  return (
    <div className="flex flex-col">
      {groups.map(({ summary, rows }) => (
        <button
          key={summary.month}
          type="button"
          onClick={() => onSelect(summary.month)}
          className="flex items-center gap-2 rounded-md px-1 py-2.5 text-left"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium">{formatMonthLabel(summary.month)}</span>
            <span className="text-xs text-muted">{rows.length}件</span>
          </div>
          <span className={`text-sm tabular-nums ${netTone(summary.net)}`}>
            <NetYen value={summary.net} />
          </span>
          <IconChevronRight size={16} className="shrink-0 text-muted" />
        </button>
      ))}
    </div>
  )
}

function MonthDetail({
  rows,
  net,
  onBack,
  onRowClick,
}: {
  rows: HistoryRow[]
  net: number
  onBack: () => void
  onRowClick?: (row: HistoryRow) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Button variant="tertiary" size="sm" onPress={onBack}>
          <IconChevronLeft size={16} />
          月一覧
        </Button>
        <span className={`text-sm tabular-nums ${netTone(net)}`}>
          収支 <NetYen value={net} />
        </span>
      </div>
      <div className="flex flex-col">
        {rows.map((row) => (
          <HistoryListRow
            key={row.txId}
            row={row}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

function HistoryListRow({ row, onClick }: { row: HistoryRow; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="rounded-md px-3 py-2 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 flex w-3.5 shrink-0 justify-center" aria-hidden>
            <IconCheck size={14} stroke={2.5} className="text-blue-600" />
          </span>
          <span className="w-10 shrink-0 text-sm text-muted">{formatDateShort(row.date)}</span>
          <div className="flex min-w-0 flex-col gap-0">
            <span className="truncate text-sm">{row.name}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0">
          <span className={`text-sm tabular-nums ${kindTone(row.kind)}`}>
            <KindYen kind={row.kind} amount={row.amount} />
          </span>
          <span className="text-xs tabular-nums">{formatYen(row.balance)}</span>
        </div>
      </div>
    </button>
  )
}
