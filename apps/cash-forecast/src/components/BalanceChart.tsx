import { useMemo } from 'react'
import { LineChart } from '@mantine/charts'
import { Stack, Text } from '@mantine/core'
import type { BalancePoint } from '../lib/chart'
import { formatDateShort } from '../lib/date'
import { formatYen } from '../lib/money'

type BalanceChartProps = {
  points: BalancePoint[]
  threshold: number
  today: string
}

/** 万円単位に丸めた短縮表示（例: 550000→"55万", -50000→"-5万", 0→"0"）。Y軸専用。 */
function formatManCompact(value: number): string {
  if (value === 0) return '0'
  const man = Math.round(value / 10_000)
  return `${man}万`
}

/** X軸ティック用の月ラベル。1月は年を添えて「26年1月」のように表示する。 */
function formatMonthTick(yyyyMmDd: string): string {
  const [year, month] = yyyyMmDd.split('-')
  const monthNum = Number(month)
  if (monthNum === 1) {
    return `${year.slice(2)}年1月`
  }
  return `${monthNum}月`
}

type DotRenderProps = {
  cx?: number
  cy?: number
  index?: number
  payload?: BalancePoint
}

/** 月次最低残高の点だけ塗り円を描画するdot関数。それ以外は空のgを返す（nullは不可）。 */
function renderMonthMinDot(threshold: number) {
  return function MonthMinDot(props: DotRenderProps) {
    const { cx, cy, index, payload } = props
    if (!payload?.isMonthMin) {
      return <g key={`dot-${index}`} />
    }
    const isBelow = payload.balance < threshold
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={isBelow ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-indigo-6)'}
        stroke="var(--mantine-color-body)"
        strokeWidth={2}
      />
    )
  }
}

export function BalanceChart({ points, threshold, today }: BalanceChartProps) {
  const monthTicks = useMemo(() => {
    const seenMonths = new Set<string>()
    const ticks: string[] = []
    for (const point of points) {
      const month = point.date.slice(0, 7)
      if (!seenMonths.has(month)) {
        seenMonths.add(month)
        ticks.push(point.date)
      }
    }
    // モバイル幅では毎月表示すると間引きが不揃いになるため、1ヶ月おきに固定する
    return ticks.filter((_, i) => i % 2 === 0)
  }, [points])

  return (
    <Stack gap={4}>
      <LineChart
        h={200}
        data={points}
        dataKey="date"
        series={[{ name: 'balance', label: '残高', color: 'indigo.6' }]}
        withLegend={false}
        curveType="stepAfter"
        strokeWidth={2}
        gridAxis="x"
        tickLine="none"
        valueFormatter={formatYen}
        xAxisProps={{
          ticks: monthTicks,
          interval: 0,
          tickFormatter: formatMonthTick,
          tick: { transform: 'translate(0, 10)', fontSize: 10, fill: 'currentColor' },
        }}
        yAxisProps={{
          width: 44,
          tickFormatter: formatManCompact,
        }}
        tooltipProps={{
          labelFormatter: (label) => (typeof label === 'string' ? formatDateShort(label) : label),
        }}
        referenceLines={[
          { y: threshold, color: 'red.6', label: 'しきい値', labelPosition: 'insideBottomRight' },
          { x: today, color: 'gray.6' },
        ]}
        lineProps={{ dot: renderMonthMinDot(threshold) }}
      />
      <Text size="xs" c="dimmed">
        ● は各月の最低残高・グレーの縦線は今日
      </Text>
    </Stack>
  )
}
