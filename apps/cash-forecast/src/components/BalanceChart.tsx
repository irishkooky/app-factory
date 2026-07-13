import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
        fill={isBelow ? '#dc2626' : 'var(--accent)'}
        stroke="var(--background)"
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

  const chartData = useMemo(
    () => points.map((point) => ({ ...point, monthMinBalance: point.isMonthMin ? point.balance : null })),
    [points],
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
        <XAxis
          dataKey="date"
          ticks={monthTicks}
          interval={0}
          tickFormatter={formatMonthTick}
          tick={{ transform: 'translate(0, 10)', fontSize: 10, fill: 'currentColor' }}
          tickLine={false}
          axisLine={true}
        />
        <YAxis
          width={44}
          tickFormatter={formatManCompact}
          tick={{ fontSize: 10, fill: 'currentColor' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => formatYen(Number(value))}
          labelFormatter={(label) => (typeof label === 'string' ? formatDateShort(label) : label)}
        />
        <ReferenceLine y={threshold} stroke="#dc2626" label={{ value: 'しきい値', position: 'insideBottomRight', fontSize: 10 }} />
        <ReferenceLine x={today} stroke="#6b7280" />
        {/* 日次残高の非表示ライン: Tooltip表示とY軸ドメイン計算のためだけに置く */}
        <Line dataKey="balance" name="残高" stroke="none" dot={false} activeDot={false} legendType="none" isAnimationActive={false} />
        <Line
          type="linear"
          dataKey="monthMinBalance"
          name="最低残高"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={renderMonthMinDot(threshold)}
          connectNulls
          tooltipType="none"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
