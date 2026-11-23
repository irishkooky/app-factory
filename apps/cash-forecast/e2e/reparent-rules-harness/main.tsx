import { useEffect, useMemo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, Surface, Toast } from '@heroui/react'
import '../../src/styles.css'
import { AmountLinesField } from '../../src/components/AmountLinesField'
import { ReparentTargetPicker } from '../../src/components/ReparentTargetPicker'
import { KindYen, kindTone } from '../../src/components/Amount'
import { formatDateShort, formatMonthLabel } from '../../src/lib/date'
import { initAmountLinesFromTx } from '../../src/lib/amountLines'
import { formatYen } from '../../src/lib/money'
import { notifyMoved, notifyQueue } from '../../src/lib/notify'
import { filterReparentMoveCandidates } from '../../src/lib/reparentCandidates'
import type { ReparentSection } from '../../src/lib/reparentCandidates'
import {
  buildReparentRulesHarnessScenario,
  HARNESS_ANCHOR_DATE,
  HARNESS_MOVED_AMOUNT,
  HARNESS_MOVED_LABEL,
  HARNESS_SOURCE_DATE,
} from '../../src/lib/reparentRulesHarnessScenario'
import type { ForecastRow } from '../../src/lib/forecast'

type View =
  | 'picker-free'
  | 'picker-tab-oneoff'
  | 'picker-tab-virtual-collapsed'
  | 'picker-tab-virtual-expanded'
  | 'picker-tab-confirmed'
  | 'picker-search'
  | 'before-move'
  | 'after-move'
  | 'date-warning'
  | 'undo-toast'

const PICKER_VIEWS: View[] = [
  'picker-free',
  'picker-tab-oneoff',
  'picker-tab-virtual-collapsed',
  'picker-tab-virtual-expanded',
  'picker-tab-confirmed',
  'picker-search',
  'date-warning',
]

function viewFromLocation(): View {
  const v = new URLSearchParams(window.location.search).get('view')
  const all: View[] = [...PICKER_VIEWS, 'before-move', 'after-move', 'undo-toast']
  if (v !== null && all.includes(v as View)) return v as View
  return 'picker-tab-oneoff'
}

function HarnessShell({ view, children }: { view: View; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg p-4" data-view={view}>
      <p className="mb-2 text-xs text-muted" data-testid="harness-meta">
        基準日 {HARNESS_ANCHOR_DATE} · ソース {HARNESS_SOURCE_DATE}（予定側）· buildForecast +
        computeReparentToRuleAddon 由来
      </p>
      <Toast.Provider placement="top" queue={notifyQueue} />
      <Surface variant="secondary" className="rounded-2xl p-4 shadow-sm">
        {children}
      </Surface>
    </div>
  )
}

function SourceTxnHeader({
  name,
  date,
  amountBefore,
  amountAfter,
}: {
  name: string
  date: string
  amountBefore: number
  amountAfter?: number
}) {
  return (
    <p className="mb-3 text-sm text-muted" data-testid="source-header">
      {name}（{formatDateShort(date)}）合計{' '}
      {amountAfter !== undefined ? (
        <>
          <span className="tabular-nums line-through">{formatYen(amountBefore)}</span>
          <span className="mx-1">→</span>
          <span className="tabular-nums font-medium text-foreground">{formatYen(amountAfter)}</span>
        </>
      ) : (
        <span className="tabular-nums font-medium text-foreground">{formatYen(amountBefore)}</span>
      )}
    </p>
  )
}

function RuleMonthPreview({ row, amountBefore }: { row: ForecastRow; amountBefore: number }) {
  const baseAmount = row.baseAmount ?? row.amount
  const month = row.ruleMonth ? formatMonthLabel(row.ruleMonth) : ''

  return (
    <div className="flex flex-col gap-4" data-testid="rule-month-after">
      <p className="text-sm text-muted" data-testid="target-header">
        {row.name}（{month}）合計{' '}
        <span className="tabular-nums line-through">{formatYen(amountBefore)}</span>
        <span className="mx-1">→</span>
        <span className="tabular-nums font-medium text-foreground">{formatYen(row.amount)}</span>
      </p>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">合計</span>
        <span className={`text-2xl font-bold tabular-nums ${kindTone(row.kind)}`}>
          <KindYen kind={row.kind} amount={row.amount} />
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="text-sm text-muted">ベース（ルール平均）</span>
          <span className={`text-sm tabular-nums ${kindTone(row.kind)}`}>
            <KindYen kind={row.kind} amount={baseAmount} />
          </span>
        </div>
        {(row.addons ?? []).map((addon) => (
          <div
            key={addon.txId}
            className="flex items-center justify-between gap-2"
            data-testid="addon-line"
          >
            <span className="min-w-0 truncate text-sm text-muted">{addon.name}</span>
            <span className={`text-sm tabular-nums ${kindTone(addon.kind)}`}>
              <KindYen kind={addon.kind} amount={addon.amount} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PickerHarness({
  view,
  showRecurringSections,
  initialTab,
  initialQuery,
}: {
  view: View
  showRecurringSections: boolean
  initialTab?: ReparentSection
  initialQuery?: string
}) {
  const scenario = useMemo(() => buildReparentRulesHarnessScenario(), [])
  const sourceBefore = scenario.transactionsBefore[0]!

  const candidates = useMemo(
    () =>
      filterReparentMoveCandidates(
        scenario.candidatesBefore.filter((c) => c.kind === 'expense'),
        { kind: 'expense', sourceTxId: sourceBefore._id },
      ),
    [scenario],
  )

  return (
    <>
      <SourceTxnHeader
        name={sourceBefore.name}
        date={sourceBefore.date}
        amountBefore={sourceBefore.amount}
      />
      <h1 className="mb-3 text-base font-semibold">別の取引へ移動</h1>
      <div data-initial-tab={initialTab ?? 'oneoff'} data-initial-query={initialQuery ?? ''}>
        <ReparentTargetPicker
          key={view}
          candidates={candidates}
          sourceDate={sourceBefore.date}
          lineLabel={HARNESS_MOVED_LABEL}
          lineAmount={HARNESS_MOVED_AMOUNT}
          kind="expense"
          showRecurringSections={showRecurringSections}
          defaultTab={initialTab}
          initialQuery={initialQuery}
          onSelect={() => {}}
          onSelectRuleMonth={() => {}}
          onCancel={() => {}}
        />
      </div>
      {view === 'date-warning' ? <DateWarningBootstrap /> : null}
    </>
  )
}

function App() {
  const view = useMemo(() => viewFromLocation(), [])
  const scenario = useMemo(() => buildReparentRulesHarnessScenario(), [])

  const sourceBefore = scenario.transactionsBefore[0]!
  const sourceAfter = scenario.transactionsAfter[0]!

  useEffect(() => {
    if (view !== 'undo-toast') return
    notifyMoved(`${HARNESS_MOVED_LABEL}を定期へ移動しました`, {
      description:
        'ルール発生日と違うため、それまでの途中残高・最低残高が変わっている場合があります（最終残高は同じことが多いです）。',
      onUndo: () => {},
    })
  }, [view])

  if (view === 'picker-free') {
    return (
      <HarnessShell view={view}>
        <PickerHarness view={view} showRecurringSections={false} initialTab="oneoff" />
      </HarnessShell>
    )
  }
  if (view === 'picker-tab-oneoff') {
    return (
      <HarnessShell view={view}>
        <PickerHarness view={view} showRecurringSections initialTab="oneoff" />
      </HarnessShell>
    )
  }
  if (view === 'picker-tab-virtual-collapsed') {
    return (
      <HarnessShell view={view}>
        <PickerHarness view={view} showRecurringSections initialTab="recurring-virtual" />
      </HarnessShell>
    )
  }
  if (view === 'picker-tab-virtual-expanded') {
    return (
      <HarnessShell view={view}>
        <PickerHarness view={view} showRecurringSections initialTab="recurring-virtual" />
        <ExpandRentBootstrap />
      </HarnessShell>
    )
  }
  if (view === 'picker-tab-confirmed') {
    return (
      <HarnessShell view={view}>
        <PickerHarness view={view} showRecurringSections initialTab="recurring-confirmed" />
      </HarnessShell>
    )
  }
  if (view === 'picker-search') {
    return (
      <HarnessShell view={view}>
        <PickerHarness
          view={view}
          showRecurringSections
          initialTab="oneoff"
          initialQuery="食料"
        />
      </HarnessShell>
    )
  }
  if (view === 'date-warning') {
    return (
      <HarnessShell view={view}>
        <PickerHarness
          view={view}
          showRecurringSections
          initialTab="recurring-virtual"
        />
      </HarnessShell>
    )
  }

  if (view === 'before-move') {
    const lines = initAmountLinesFromTx({
      amount: sourceBefore.amount,
      amountBreakdown: sourceBefore.amountBreakdown,
    })
    return (
      <HarnessShell view={view}>
        <h1 className="mb-1 text-base font-semibold">取引を編集（移動前）</h1>
        <SourceTxnHeader
          name={sourceBefore.name}
          date={sourceBefore.date}
          amountBefore={sourceBefore.amount}
        />
        <AmountLinesField lines={lines} onChange={() => {}} kind="expense" onMoveLine={() => {}} />
      </HarnessShell>
    )
  }

  if (view === 'after-move') {
    const lines = initAmountLinesFromTx({
      amount: sourceAfter.amount,
      amountBreakdown: sourceAfter.amountBreakdown,
    })
    const virtualAfter = scenario.virtualRentAfter
    const virtualBefore = scenario.virtualRentBefore
    if (!virtualAfter || !virtualBefore) {
      return (
        <HarnessShell view={view}>
          <p className="text-sm text-danger">仮想行の導出に失敗しました</p>
        </HarnessShell>
      )
    }
    return (
      <HarnessShell view={view}>
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-1 text-base font-semibold">移動後：ソース取引</h2>
            <SourceTxnHeader
              name={sourceBefore.name}
              date={sourceBefore.date}
              amountBefore={sourceBefore.amount}
              amountAfter={sourceAfter.amount}
            />
            <AmountLinesField lines={lines} onChange={() => {}} kind="expense" onMoveLine={() => {}} />
          </section>
          <section className="border-t border-default-200 pt-4">
            <h2 className="mb-1 text-base font-semibold">移動後：未確定ルール月</h2>
            <RuleMonthPreview row={virtualAfter} amountBefore={virtualBefore.amount} />
          </section>
        </div>
      </HarnessShell>
    )
  }

  if (view === 'undo-toast') {
    return (
      <HarnessShell view={view}>
        <p className="text-sm text-muted">移動完了直後のトースト（Harness で notifyMoved を発火）</p>
        <Button className="mt-4" variant="tertiary" onPress={() => {}}>
          ドロワーは閉じた想定
        </Button>
      </HarnessShell>
    )
  }

  return null
}

function DateWarningBootstrap() {
  useEffect(() => {
    const run = () => {
      document.querySelector<HTMLElement>('[data-testid="reparent-tab-recurring-virtual"]')?.click()
      const buttons = Array.from(document.querySelectorAll('button[data-candidate-key]'))
      const target =
        buttons.find((b) => b.textContent?.includes('家賃') && b.textContent.includes('2026年4月')) ??
        buttons.find((b) => b.textContent?.includes('家賃') && b.textContent.includes('2026年5月'))
      target?.click()
    }
    const t = setTimeout(run, 120)
    return () => clearTimeout(t)
  }, [])
  return null
}

function ExpandRentBootstrap() {
  useEffect(() => {
    const run = () => {
      document.querySelector<HTMLElement>('[data-testid="reparent-tab-recurring-virtual"]')?.click()
      const expandAll = () => {
        const more = Array.from(document.querySelectorAll('button')).filter((b) =>
          b.textContent?.includes('もっと見る'),
        )
        if (more.length === 0) return
        for (const btn of more) btn.click()
        setTimeout(expandAll, 80)
      }
      setTimeout(expandAll, 80)
    }
    const t = setTimeout(run, 80)
    return () => clearTimeout(t)
  }, [])
  return null
}

createRoot(document.getElementById('root')!).render(<App />)