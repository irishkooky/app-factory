import { useMemo } from 'react'
import { Button, Drawer } from '@heroui/react'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import type { ForecastRow } from '../lib/forecast'
import type { HistoryRow } from '../lib/history'
import { formatMonthLabel, monthOf } from '../lib/date'
import { summarizeByMonth } from '../lib/summary'
import { NetYen, netTone } from './Amount'
import { ForecastListRow, HistoryListRow } from './ForecastList'

export type PastMonthsNav = { screen: 'list' } | { screen: 'detail'; month: string }

type PastMonthsDrawerProps = {
  opened: boolean
  onClose: () => void
  nav: PastMonthsNav
  onNavChange: (nav: PastMonthsNav) => void
  historyRows: HistoryRow[]
  /** 基準日より後・今日より前の予測行。まだ実績化されていないが、メインには出さないのでここで見せる。 */
  pastRows: ForecastRow[]
  today: string
  onHistoryRowClick: (row: HistoryRow) => void
  onForecastRowClick: (row: ForecastRow) => void
}

export function PastMonthsDrawer({
  opened,
  onClose,
  nav,
  onNavChange,
  historyRows,
  pastRows,
  today,
  onHistoryRowClick,
  onForecastRowClick,
}: PastMonthsDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            {nav.screen === 'list' ? (
              <Drawer.Heading>過去の月</Drawer.Heading>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label="過去の月に戻る"
                  onPress={() => onNavChange({ screen: 'list' })}
                >
                  <IconChevronLeft size={18} />
                </Button>
                <Drawer.Heading>{formatMonthLabel(nav.month)}</Drawer.Heading>
              </div>
            )}
          </Drawer.Header>
          <Drawer.Body>
            {opened && (
              <PastMonthsContent
                nav={nav}
                onNavChange={onNavChange}
                historyRows={historyRows}
                pastRows={pastRows}
                today={today}
                onHistoryRowClick={onHistoryRowClick}
                onForecastRowClick={onForecastRowClick}
              />
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function PastMonthsContent({
  nav,
  onNavChange,
  historyRows,
  pastRows,
  today,
  onHistoryRowClick,
  onForecastRowClick,
}: Omit<PastMonthsDrawerProps, 'opened' | 'onClose'>) {
  // 実績は基準日以前、予測行は基準日より後なので、連結すれば日付順のまま残高もつながる。
  const months = useMemo(() => {
    const rows = [...historyRows, ...pastRows]
    const counts = new Map<string, number>()
    for (const row of rows) {
      const month = monthOf(row.date)
      counts.set(month, (counts.get(month) ?? 0) + 1)
    }
    return summarizeByMonth(rows)
      .reverse()
      .map((summary) => ({ month: summary.month, net: summary.net, count: counts.get(summary.month) ?? 0 }))
  }, [historyRows, pastRows])

  if (nav.screen === 'list') {
    if (months.length === 0) {
      return <p className="py-8 text-center text-muted">過去の月はまだありません。</p>
    }
    return (
      <div className="flex flex-col divide-y divide-border">
        {months.map(({ month, net, count }) => (
          <button
            key={month}
            type="button"
            onClick={() => onNavChange({ screen: 'detail', month })}
            className="flex items-center gap-2 px-1 py-3 text-left"
          >
            <span className="text-sm font-medium">{formatMonthLabel(month)}</span>
            <span className="text-sm text-muted">{count}件</span>
            <span className={`ml-auto text-sm tabular-nums ${netTone(net)}`}>
              収支 <NetYen value={net} />
            </span>
            <IconChevronRight size={16} className="shrink-0 text-muted" />
          </button>
        ))}
      </div>
    )
  }

  const monthHistory = historyRows.filter((row) => monthOf(row.date) === nav.month)
  const monthPast = pastRows.filter((row) => monthOf(row.date) === nav.month)
  const summary = months.find((m) => m.month === nav.month)

  if (summary === undefined) {
    return <p className="py-8 text-center text-muted">この月の明細はありません。</p>
  }

  return (
    <div className="flex flex-col">
      <div className="mb-1 flex items-center justify-between px-1 text-sm">
        <span className="text-muted">{summary.count}件</span>
        <span className={`tabular-nums ${netTone(summary.net)}`}>
          収支 <NetYen value={summary.net} />
        </span>
      </div>
      {monthHistory.map((row) => (
        <HistoryListRow key={row.txId} row={row} onClick={() => onHistoryRowClick(row)} />
      ))}
      {monthPast.map((row) => (
        <ForecastListRow key={row.key} row={row} isToday={false} today={today} onClick={() => onForecastRowClick(row)} />
      ))}
    </div>
  )
}
