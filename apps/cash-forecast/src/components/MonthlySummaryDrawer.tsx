import { useMemo } from 'react'
import { Drawer, Stack, Table, Text } from '@mantine/core'
import type { ForecastRow } from '../lib/forecast'
import { formatMonthLabel, monthOf } from '../lib/date'
import { formatYen } from '../lib/money'
import { summarizeByMonth } from '../lib/summary'

type MonthlySummaryDrawerProps = {
  opened: boolean
  onClose: () => void
  rows: ForecastRow[]
  anchorDate: string
}

export function MonthlySummaryDrawer({ opened, onClose, rows, anchorDate }: MonthlySummaryDrawerProps) {
  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" size="lg" title="月次サマリー">
      {opened && <MonthlySummaryContent rows={rows} anchorDate={anchorDate} />}
    </Drawer>
  )
}

function MonthlySummaryContent({ rows, anchorDate }: { rows: ForecastRow[]; anchorDate: string }) {
  const summaries = useMemo(() => summarizeByMonth(rows), [rows])
  const anchorMonth = monthOf(anchorDate)

  if (summaries.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        表示できるデータがありません。
      </Text>
    )
  }

  return (
    <Stack gap="sm">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>月</Table.Th>
            <Table.Th ta="right">収入</Table.Th>
            <Table.Th ta="right">支出</Table.Th>
            <Table.Th ta="right">収支</Table.Th>
            <Table.Th ta="right">貯蓄率</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {summaries.map((summary) => {
            const isAnchorMonth = summary.month === anchorMonth
            return (
              <Table.Tr key={summary.month}>
                <Table.Td>
                  {formatMonthLabel(summary.month)}
                  {isAnchorMonth && (
                    <Text component="span" size="xs" c="dimmed">
                      *
                    </Text>
                  )}
                </Table.Td>
                <Table.Td ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatYen(summary.income)}
                </Table.Td>
                <Table.Td ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatYen(summary.expense)}
                </Table.Td>
                <Table.Td
                  ta="right"
                  c={summary.net >= 0 ? 'blue.7' : 'red.7'}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {summary.net >= 0 ? '+' : ''}
                  {formatYen(summary.net)}
                </Table.Td>
                <Table.Td ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {summary.savingsRate === null ? '—' : `${Math.round(summary.savingsRate * 100)}%`}
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed">
        * 基準日以降の集計
      </Text>
    </Stack>
  )
}
