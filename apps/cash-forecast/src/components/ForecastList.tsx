import { useMemo } from 'react'
import { Badge, Divider, Group, Stack, Text, UnstyledButton } from '@mantine/core'
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
      <Text c="dimmed" ta="center" py="xl">
        表示できる予定がありません。ルールや取引を追加してください。
      </Text>
    )
  }

  return (
    <Stack gap={0}>
      {items.map((item) => {
        if (item.type === 'month') {
          const summary = monthSummaries.get(item.month)
          return (
            <Divider
              key={item.key}
              label={<MonthDividerLabel month={item.month} summary={summary} />}
              labelPosition="left"
              mt="md"
              mb="xs"
            />
          )
        }
        if (item.type === 'today') {
          return <Divider key={item.key} label="今日" labelPosition="center" color="blue" my="xs" />
        }
        return <ForecastListRow key={item.key} row={item.row} onClick={() => onRowClick(item.row)} />
      })}
    </Stack>
  )
}

function MonthDividerLabel({ month, summary }: { month: string; summary: MonthSummary | undefined }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="sm" fw={500}>
        {formatMonthLabel(month)}
      </Text>
      {summary && (
        <Text
          size="sm"
          c={summary.net >= 0 ? 'blue.7' : 'red.7'}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          収支 {summary.net >= 0 ? '+' : ''}
          {formatYen(summary.net)}
        </Text>
      )}
    </Group>
  )
}

function ForecastListRow({ row, onClick }: { row: ForecastRow; onClick: () => void }) {
  const amountColor = row.kind === 'expense' ? 'red.7' : 'blue.7'
  const amountSign = row.kind === 'expense' ? '-' : '+'
  const balanceColor = row.balance < 0 ? 'red.7' : undefined
  const isConfirmed = !row.isVirtual && row.ruleId !== undefined
  const addonCount = row.addons?.length ?? 0

  return (
    <UnstyledButton
      onClick={onClick}
      py="xs"
      px="sm"
      bg={row.belowThreshold ? 'yellow.1' : undefined}
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="xs" wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
          <Text
            size="sm"
            c="dimmed"
            style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, width: 40 }}
          >
            {formatDateShort(row.date)}
          </Text>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.name}
              </Text>
              {row.isVirtual && (
                <Badge size="xs" variant="light" style={{ flexShrink: 0 }}>
                  予定
                </Badge>
              )}
              {isConfirmed && (
                <Badge size="xs" variant="light" color="teal" style={{ flexShrink: 0 }}>
                  確定
                </Badge>
              )}
            </Group>
            {addonCount > 0 && (
              <Text size="xs" c="dimmed">
                上乗せ {addonCount}件
              </Text>
            )}
          </Stack>
        </Group>
        <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
          <Text size="sm" c={amountColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {amountSign}
            {formatYen(row.amount)}
          </Text>
          <Text size="xs" c={balanceColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatYen(row.balance)}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  )
}
