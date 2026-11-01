import { summarizeSeries, type CheckpointSeriesView } from '../lib/checkpoint'
import { formatDateShort } from '../lib/date'
import { formatYen } from '../lib/money'
import { NetYen, netTone } from './Amount'
import { ProGate } from './BillingControls'

type SeriesRow = CheckpointSeriesView & { _id: string }

type CheckpointSummaryCardProps = {
  series: SeriesRow[] | undefined
  onOpenDetail: () => void
}

export function CheckpointSummaryCard({ series, onOpenDetail }: CheckpointSummaryCardProps) {
  return (
    <ProGate title="予測チェックポイント" description="1年後予測の推移はProプラン限定です">
      <CheckpointSummaryBody series={series ?? []} onOpenDetail={onOpenDetail} />
    </ProGate>
  )
}

function CheckpointSummaryBody({
  series,
  onOpenDetail,
}: {
  series: SeriesRow[]
  onOpenDetail: () => void
}) {
  const inProgress = series.filter((s) => s.status === 'in_progress')
  const focus = inProgress[0] ?? series[0]
  const summary = focus ? summarizeSeries(focus) : null

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="w-full rounded-2xl border border-border p-4 text-left transition-colors hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">予測チェックポイント</span>
          {focus ? (
            <span className="text-xs text-muted">
              ターゲット {formatDateShort(focus.targetDate)}
              {focus.status === 'reached' ? ' · 到達済' : ' · 進行中'}
            </span>
          ) : (
            <span className="text-xs text-muted">四半期ごとに1年後予測を記録します</span>
          )}
        </div>
        <span className="text-xs text-accent">詳細</span>
      </div>

      {summary ? (
        <div className="mt-3 flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted">最新の予測残高</span>
            <span className="text-lg font-semibold tabular-nums">{formatYen(summary.latestPredicted)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted">開始時から</span>
            <span className={`tabular-nums font-medium ${netTone(summary.delta)}`}>
              <NetYen value={summary.delta} />
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          まだ観測点がありません。Proのまま四半期初日を迎えると自動で始まります。
        </p>
      )}

      {inProgress.length > 1 && (
        <p className="mt-2 text-xs text-muted">進行中 {inProgress.length} 本</p>
      )}
    </button>
  )
}
