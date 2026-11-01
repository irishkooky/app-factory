import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CheckpointObservationView } from '../lib/checkpoint'
import { formatDateShort } from '../lib/date'
import { formatYen } from '../lib/money'

type CheckpointChartProps = {
  observations: CheckpointObservationView[]
  targetDate: string
}

function formatManCompact(value: number): string {
  if (value === 0) return '0'
  const man = Math.round(value / 10_000)
  return `${man}万`
}

type DotProps = {
  cx?: number
  cy?: number
  index?: number
  payload?: { kind: string; predicted: number | null; actual: number | null }
}

function renderActualDot(props: DotProps) {
  const { cx, cy, index, payload } = props
  if (payload?.actual == null || cx == null || cy == null) {
    return <g key={`actual-dot-${index}`} />
  }
  return (
    <circle
      key={`actual-dot-${index}`}
      cx={cx}
      cy={cy}
      r={5}
      fill="#0f766e"
      stroke="var(--background)"
      strokeWidth={2}
    />
  )
}

export function CheckpointChart({ observations, targetDate }: CheckpointChartProps) {
  const chartData = useMemo(
    () =>
      observations.map((o) => ({
        date: o.observedAt,
        kind: o.kind,
        predicted: o.kind === 'forecast' ? o.predictedBalanceAtTarget : null,
        actual: o.kind === 'actual' ? o.predictedBalanceAtTarget : null,
        balanceToday: o.balanceToday,
      })),
    [observations],
  )

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">まだ観測点がありません。</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">ターゲット {formatDateShort(targetDate)} 時点の予測残高</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => (typeof v === 'string' ? formatDateShort(v) : v)}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            tickLine={false}
            axisLine
          />
          <YAxis
            width={44}
            tickFormatter={formatManCompact}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              const label = name === 'actual' ? '実残高' : name === 'predicted' ? '予測残高' : String(name)
              return [formatYen(Number(value)), label]
            }}
            labelFormatter={(label) => (typeof label === 'string' ? formatDateShort(label) : label)}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--foreground)',
            }}
          />
          <Line
            type="linear"
            dataKey="predicted"
            name="predicted"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--background)', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="actual"
            name="actual"
            stroke="#0f766e"
            strokeWidth={0}
            dot={renderActualDot}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-[var(--accent)]" />
          予測残高
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-teal-700" />
          到達時の実残高
        </span>
      </div>
    </div>
  )
}
