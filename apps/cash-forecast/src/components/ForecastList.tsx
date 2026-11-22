import { useMemo } from 'react'
import { Chip, Separator } from '@heroui/react'
import { IconCheck } from '@tabler/icons-react'
import type { ForecastRow } from '../lib/forecast'
import { buildForecastListItems, type CurrentPosition } from '../lib/forecastList'
import { formatDateShort, formatMonthLabel } from '../lib/date'
import { formatYen } from '../lib/money'
import { KindYen, NetYen, kindTone, netTone } from './Amount'
import { summarizeByMonth, type MonthSummary } from '../lib/summary'

type ForecastListProps = {
  rows: ForecastRow[]
  today: string
  anchorDate: string
  anchorBalance: number
  onRowClick: (row: ForecastRow) => void
  onTodayClick?: () => void
}

export function ForecastList({
  rows,
  today,
  anchorDate,
  anchorBalance,
  onRowClick,
  onTodayClick,
}: ForecastListProps) {
  const items = buildForecastListItems({ rows, today, anchorDate, anchorBalance })
  const monthSummaries = useMemo(
    () => new Map(summarizeByMonth(rows).map((summary) => [summary.month, summary])),
    [rows],
  )

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted">
        毎月の予定や取引を登録すると、ここに12ヶ月分の予測が並びます。
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        if (item.type === 'month') {
          const summary = monthSummaries.get(item.month)
          return (
            <div key={item.key} className="mt-4 mb-1.5 flex items-center gap-2">
              <MonthDividerLabel month={item.month} summary={summary} />
              <Separator className="flex-1" />
            </div>
          )
        }
        if (item.type === 'today') {
          return <TodayMarker key={item.key} today={item.today} position={item.position} onClick={onTodayClick} />
        }
        return (
          <ForecastListRow
            key={item.key}
            row={item.row}
            isToday={item.isToday}
            today={today}
            onClick={() => onRowClick(item.row)}
          />
        )
      })}
    </div>
  )
}

function MonthDividerLabel({ month, summary }: { month: string; summary: MonthSummary | undefined }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="text-sm font-medium">{formatMonthLabel(month)}</span>
      {summary && <NetLabel net={summary.net} />}
    </div>
  )
}

function NetLabel({ net }: { net: number }) {
  return <span className={`text-sm tabular-nums ${netTone(net)}`}>収支 <NetYen value={net} /></span>
}

// 「今日」の位置を示すマーカー。しきい値割れ（黄色系）と衝突しないよう、
// 今日の強調にはグラフの線と同じ --accent（青紫）を使う。
function TodayMarker({
  today,
  position,
  onClick,
}: {
  today: string
  position: CurrentPosition
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="my-2 flex w-full items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-left"
    >
      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
        今日
      </span>
      <span className="text-sm font-medium tabular-nums">{formatDateShort(today)}</span>
      <div className="ml-auto flex flex-col items-end">
        <span className={`text-base font-bold tabular-nums ${position.balance < 0 ? 'text-red-600' : ''}`}>
          {formatYen(position.balance)}
        </span>
        <span className="text-xs text-muted">
          {/* anchorDate > today になり得る異常データでは asOfDate が未来日になり得るため、
              hasTodayRows または asOfDate >= today のときは「◯◯から変動なし」ではなく「現在の残高」とする。 */}
          {position.hasTodayRows || position.asOfDate >= today
            ? '現在の残高'
            : `${formatDateShort(position.asOfDate)} から変動なし`}
        </span>
      </div>
      {/* aria-label だと日付・残高の読み上げごと上書きされるため、視覚非表示テキストで用途を補足する */}
      <span className="sr-only">残高を合わせる</span>
    </button>
  )
}

function ForecastListRow({
  row,
  isToday,
  today,
  onClick,
}: {
  row: ForecastRow
  isToday: boolean
  today: string
  onClick: () => void
}) {
  const balanceColor = row.balance < 0 ? 'text-red-600' : undefined
  const addonCount = row.addons?.length ?? 0
  // 背景は排他にする。Tailwind は同じプロパティのユーティリティを併記しても
  // クラス文字列の順序では解決されないため、三項で1つだけ選ぶこと。
  const bg = row.belowThreshold ? 'bg-warning-soft' : isToday ? 'bg-accent/10' : ''
  const confirmed = !row.isVirtual

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border-l-2 px-3 py-2 text-left ${isToday ? 'border-accent' : 'border-transparent'} ${bg}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 flex w-3.5 shrink-0 justify-center" aria-hidden>
            {confirmed && <IconCheck size={14} stroke={2.5} className="text-blue-600" />}
          </span>
          <span className={`w-10 shrink-0 text-sm ${isToday ? 'font-semibold text-accent' : 'text-muted'}`}>
            {formatDateShort(row.date)}
          </span>
          <div className="flex min-w-0 flex-col gap-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm">
                {row.name}
                {row.periodLabel ?? ''}
              </span>
              {/* 確定は左のチェックで示す。予定バッジは薄く残し主役にしない。
                  期限を過ぎてまだ見込みの行だけ要確認として操作待ちを示す。 */}
              {row.isVirtual &&
                (row.date < today ? (
                  <Chip size="sm" variant="soft" color="warning" className="shrink-0">
                    要確認
                  </Chip>
                ) : (
                  <Chip size="sm" variant="soft" className="shrink-0 opacity-45">
                    予定
                  </Chip>
                ))}
            </div>
            {addonCount > 0 && <span className="text-xs text-muted">上乗せ {addonCount}件</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0">
          <span className={`text-sm tabular-nums ${kindTone(row.kind)}`}><KindYen kind={row.kind} amount={row.amount} /></span>
          <span className={`text-xs tabular-nums ${isToday ? 'font-bold' : ''} ${balanceColor ?? ''}`}>
            {formatYen(row.balance)}
          </span>
        </div>
      </div>
    </button>
  )
}
