import { useMemo, useState } from 'react'
import { Button, Drawer, Spinner } from '@heroui/react'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useQuery } from 'convex/react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { api } from '../../convex/_generated/api'
import {
  buildCheckRows,
  checkTargets,
  initialTarget,
  nextQuarterEnd,
  type CheckRow,
  type ForecastSnapshot,
} from '../lib/forecastSnapshot'
import { formatYen } from '../lib/money'
import { ProGate } from './BillingControls'

const ACTUAL_COLOR = '#0f766e'

type ForecastCheckDrawerProps = {
  opened: boolean
  onClose: () => void
  today: string
}

export function ForecastCheckDrawer({ opened, onClose, today }: ForecastCheckDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="sm:max-w-2xl">
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>予測の答え合わせ</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && (
              <ProGate
                title="予測の答え合わせ"
                description="過去の予測と実際の残高の比較はProプラン限定です。記録は四半期末ごとに続いているので、Proにするとこれまでの分もすぐ見られます"
              >
                <ForecastCheckContent today={today} />
              </ProGate>
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function ForecastCheckContent({ today }: { today: string }) {
  const snapshots = useQuery(api.forecastSnapshots.list)

  if (snapshots === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (snapshots.length === 0) {
    return <p className="py-4 text-sm text-muted">最初の記録は {formatDateSlash(nextQuarterEnd(today))} です</p>
  }

  return <ForecastCheckView snapshots={snapshots} today={today} />
}

function ForecastCheckView({ snapshots, today }: { snapshots: ForecastSnapshot[]; today: string }) {
  const targets = useMemo(() => checkTargets(snapshots), [snapshots])
  const [selected, setSelected] = useState<string | null>(null)
  const target = selected !== null && targets.includes(selected) ? selected : initialTarget(snapshots, targets, today)
  if (target === null) return null

  const index = targets.indexOf(target)
  const rows = buildCheckRows(snapshots, target, today)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          isIconOnly
          variant="tertiary"
          aria-label="前の日付"
          isDisabled={index <= 0}
          onPress={() => setSelected(targets[index - 1])}
        >
          <IconChevronLeft size={20} />
        </Button>
        <span className="font-semibold">{formatQuarterEnd(target)}の残高</span>
        <Button
          isIconOnly
          variant="tertiary"
          aria-label="次の日付"
          isDisabled={index >= targets.length - 1}
          onPress={() => setSelected(targets[index + 1])}
        >
          <IconChevronRight size={20} />
        </Button>
      </div>

      <CheckChart rows={rows} />

      <dl className="flex flex-col gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.monthsBefore} className="flex items-baseline justify-between gap-3">
            <dt className={row.monthsBefore === 0 ? 'font-medium' : 'text-muted'}>{rowLabel(row.monthsBefore)}</dt>
            <dd className="flex items-baseline gap-2 tabular-nums">
              {row.balance === null ? (
                <>
                  {row.status === 'upcoming' && (
                    <span className="text-xs text-muted">{formatDateSlash(row.takenOn)} に記録</span>
                  )}
                  {row.status === 'missed' && <span className="text-xs text-muted">記録なし</span>}
                  <span className="text-muted">—</span>
                </>
              ) : (
                <span className={row.monthsBefore === 0 ? 'font-semibold' : undefined}>{formatYen(row.balance)}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** 横軸は「1年前 … 3か月前・実際」の等間隔。実際の残高は破線で横に引き、各予測との差を見せる。 */
function CheckChart({ rows }: { rows: CheckRow[] }) {
  const actual = rows.find((row) => row.monthsBefore === 0)?.balance ?? null
  const data = rows.map((row) => ({
    label: axisLabel(row.monthsBefore),
    predicted: row.monthsBefore > 0 ? row.balance : null,
    actual: row.monthsBefore === 0 ? row.balance : null,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
        <XAxis
          dataKey="label"
          interval={0}
          tick={{ fontSize: 10, fill: 'currentColor' }}
          tickLine={false}
          axisLine
        />
        <YAxis
          width={44}
          domain={['auto', 'auto']}
          tickFormatter={formatManCompact}
          tick={{ fontSize: 10, fill: 'currentColor' }}
          tickLine={false}
          axisLine={false}
        />
        {actual !== null && <ReferenceLine y={actual} stroke={ACTUAL_COLOR} strokeDasharray="4 4" />}
        <Line
          type="linear"
          dataKey="predicted"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--background)', strokeWidth: 2 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="actual"
          stroke="none"
          dot={{ r: 5, fill: ACTUAL_COLOR, stroke: 'var(--background)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function rowLabel(monthsBefore: CheckRow['monthsBefore']): string {
  return monthsBefore === 0 ? '実際' : `${axisLabel(monthsBefore)}の予測`
}

function axisLabel(monthsBefore: CheckRow['monthsBefore']): string {
  if (monthsBefore === 0) return '実際'
  return monthsBefore === 12 ? '1年前' : `${monthsBefore}か月前`
}

/** "2027-12-31" → "2027年12月末" */
function formatQuarterEnd(date: string): string {
  return `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月末`
}

/** "2027-03-31" → "2027/3/31" */
function formatDateSlash(date: string): string {
  return `${date.slice(0, 4)}/${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

function formatManCompact(value: number): string {
  if (value === 0) return '0'
  return `${Math.round(value / 10_000)}万`
}
