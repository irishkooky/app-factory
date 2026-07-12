import { useMemo } from 'react'
import { Drawer, Table } from '@heroui/react'
import type { ForecastRow } from '../lib/forecast'
import { formatDateShort, formatMonthLabel, monthOf } from '../lib/date'
import { formatYen } from '../lib/money'
import { summarizeByMonth } from '../lib/summary'
import { ProGate } from './BillingControls'

type MonthlySummaryDrawerProps = {
  opened: boolean
  onClose: () => void
  rows: ForecastRow[]
  anchorDate: string
  threshold: number
}

export function MonthlySummaryDrawer({
  opened,
  onClose,
  rows,
  anchorDate,
  threshold,
}: MonthlySummaryDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="sm:max-w-2xl">
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>月次サマリー</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && (
              <ProGate title="月次サマリー" description="月次サマリーはProプラン限定です">
                <MonthlySummaryContent rows={rows} anchorDate={anchorDate} threshold={threshold} />
              </ProGate>
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function MonthlySummaryContent({
  rows,
  anchorDate,
  threshold,
}: {
  rows: ForecastRow[]
  anchorDate: string
  threshold: number
}) {
  const summaries = useMemo(() => summarizeByMonth(rows), [rows])
  const anchorMonth = monthOf(anchorDate)

  if (summaries.length === 0) {
    return <p className="py-8 text-center text-muted">表示できるデータがありません。</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="月次サマリー" className="min-w-[560px]">
            <Table.Header>
              <Table.Column>月</Table.Column>
              <Table.Column className="text-right">収入</Table.Column>
              <Table.Column className="text-right">支出</Table.Column>
              <Table.Column className="text-right">収支</Table.Column>
              <Table.Column className="text-right">貯蓄率</Table.Column>
              <Table.Column className="text-right">最低残高</Table.Column>
            </Table.Header>
            <Table.Body>
              {summaries.map((summary) => {
                const isAnchorMonth = summary.month === anchorMonth
                return (
                  <Table.Row key={summary.month}>
                    <Table.Cell>
                      {formatMonthLabel(summary.month)}
                      {isAnchorMonth && <span className="text-xs text-muted">*</span>}
                    </Table.Cell>
                    <Table.Cell className="text-right tabular-nums">{formatYen(summary.income)}</Table.Cell>
                    <Table.Cell className="text-right tabular-nums">{formatYen(summary.expense)}</Table.Cell>
                    <Table.Cell
                      className={`text-right tabular-nums ${summary.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}
                    >
                      {summary.net >= 0 ? '+' : ''}
                      {formatYen(summary.net)}
                    </Table.Cell>
                    <Table.Cell className="text-right tabular-nums">
                      {summary.savingsRate === null ? '—' : `${Math.round(summary.savingsRate * 100)}%`}
                    </Table.Cell>
                    <Table.Cell className="text-right tabular-nums">
                      <div className="flex flex-col items-end gap-0">
                        <span className={summary.minBalance < threshold ? 'text-red-600' : undefined}>
                          {formatYen(summary.minBalance)}
                        </span>
                        <span className="text-xs text-muted">{formatDateShort(summary.minBalanceDate)}</span>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      <p className="text-xs text-muted">* 基準日以降の集計</p>
    </div>
  )
}
