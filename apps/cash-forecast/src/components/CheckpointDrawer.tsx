import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, Chip, Drawer, Spinner } from '@heroui/react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  MAX_IN_PROGRESS_SERIES,
  summarizeSeries,
  type CheckpointSeriesView,
} from '../lib/checkpoint'
import { formatDateShort, todayJST } from '../lib/date'
import { formatYen } from '../lib/money'
import { notifyError, notifySaved } from '../lib/notify'
import { NetYen, netTone } from './Amount'
import { ProGate } from './BillingControls'
import { CheckpointChart } from './CheckpointChart'

type SeriesRow = CheckpointSeriesView & { _id: Id<'forecastSeries'> }

type CheckpointDrawerProps = {
  opened: boolean
  onClose: () => void
  series: SeriesRow[] | undefined
}

export function CheckpointDrawer({ opened, onClose, series }: CheckpointDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="sm:max-w-2xl">
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>予測チェックポイント</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && (
              <ProGate title="予測チェックポイント" description="1年後予測の推移はProプラン限定です">
                <CheckpointDrawerContent series={series ?? []} />
              </ProGate>
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function CheckpointDrawerContent({ series }: { series: SeriesRow[] }) {
  const startManual = useMutation(api.checkpoints.startManual)
  const [selectedId, setSelectedId] = useState<Id<'forecastSeries'> | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (series.length === 0) {
      setSelectedId(null)
      return
    }
    if (selectedId === null || !series.some((s) => s._id === selectedId)) {
      setSelectedId(series[0]._id)
    }
  }, [series, selectedId])

  const selected = useMemo(
    () => series.find((s) => s._id === selectedId) ?? null,
    [series, selectedId],
  )
  const summary = selected ? summarizeSeries(selected) : null
  const inProgressCount = series.filter((s) => s.status === 'in_progress').length
  const canStartManual = inProgressCount < MAX_IN_PROGRESS_SERIES

  const handleStart = async () => {
    setStarting(true)
    try {
      const id = await startManual({ today: todayJST() })
      setSelectedId(id)
      notifySaved()
    } catch (err) {
      notifyError(err, 'シリーズの開始に失敗しました')
    } finally {
      setStarting(false)
    }
  }

  if (series.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-muted">
          四半期初日（1/1・4/1・7/1・10/1）に自動でシリーズが始まります。今すぐ始めることもできます。
        </p>
        <Button onPress={handleStart} isPending={starting} isDisabled={starting || !canStartManual}>
          {starting && <Spinner color="current" size="sm" />}
          今すぐシリーズを開始
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {series.map((s) => {
          const active = s._id === selectedId
          return (
            <button
              key={s._id}
              type="button"
              onClick={() => setSelectedId(s._id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border text-muted hover:bg-surface'
              }`}
            >
              {formatDateShort(s.startedAt)} → {formatDateShort(s.targetDate)}
              {s.status === 'reached' ? ' · 済' : ''}
            </button>
          )
        })}
      </div>

      {selected && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="soft">
              {selected.source === 'manual' ? '手動開始' : '四半期開始'}
            </Chip>
            <Chip size="sm" variant="soft">
              {selected.status === 'reached' ? '到達済' : '進行中'}
            </Chip>
            <span className="text-xs text-muted">
              観測 {selected.observations.length} 点
            </span>
          </div>

          {summary && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="開始時の予測" value={formatYen(summary.firstPredicted)} />
              <Stat label="最新の予測" value={formatYen(summary.latestPredicted)} />
              <Stat
                label="開始時からの差"
                value={<span className={netTone(summary.delta)}><NetYen value={summary.delta} /></span>}
              />
              <Stat label="直近の今日残高" value={formatYen(summary.balanceToday)} />
            </div>
          )}

          <CheckpointChart
            observations={selected.observations}
            targetDate={selected.targetDate}
          />
        </>
      )}

      {canStartManual && (
        <Button
          variant="secondary"
          onPress={handleStart}
          isPending={starting}
          isDisabled={starting}
        >
          {starting && <Spinner color="current" size="sm" />}
          新しいシリーズを手動開始
        </Button>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
