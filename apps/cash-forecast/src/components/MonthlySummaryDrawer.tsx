import { useMemo } from 'react'
import { Drawer, Table } from '@heroui/react'
import type { ForecastRow } from '../lib/forecast'
import { formatDateShort, formatMonthLabel, monthOf } from '../lib/date'
import { formatYen } from '../lib/money'
import { averageSavings, summarizeByMonth } from '../lib/summary'
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
  const average = useMemo(() => averageSavings(summaries, anchorMonth), [summaries, anchorMonth])

  if (summaries.length === 0) {
    return <p className="py-8 text-center text-muted">表示できるデータがありません。</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:hidden">
        {summaries.map((summary) => (
          <div key={summary.month} className="rounded-xl border border-border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">
                {formatMonthLabel(summary.month)}
                {summary.month === anchorMonth && <span className="text-xs text-muted">*</span>}
              </span>
              <span className={`text-base font-semibold tabular-nums ${summary.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                収支 {summary.net >= 0 ? '+' : ''}{formatYen(summary.net)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <SummaryStat label="収入" value={formatYen(summary.income)} />
              <SummaryStat label="支出" value={formatYen(summary.expense)} />
              <SummaryStat label="貯蓄率" value={summary.savingsRate === null ? '—' : `${Math.round(summary.savingsRate * 100)}%`} />
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted">最低残高</span>
                <span className="flex flex-col items-end gap-0">
                  <span className={`tabular-nums ${summary.minBalance < threshold ? 'text-red-600' : ''}`}>{formatYen(summary.minBalance)}</span>
                  <span className="text-xs text-muted">{formatDateShort(summary.minBalanceDate)}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block">
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
      </div>
      {average && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">平均貯蓄率（基準月を除く{average.months}ヶ月）</span>
          <span className="tabular-nums">
            {average.savingsRate === null ? '—' : `${Math.round(average.savingsRate * 100)}%`}
            {'（'}
            <span className={average.totalNet >= 0 ? 'text-blue-600' : 'text-red-600'}>
              {average.totalNet >= 0 ? '+' : ''}
              {formatYen(average.totalNet)}
            </span>
            {'）'}
          </span>
        </div>
      )}
      <p className="text-xs text-muted">* 基準日以降の集計（平均には含めません）</p>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
