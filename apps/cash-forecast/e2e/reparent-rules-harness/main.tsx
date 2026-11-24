import { useEffect, useMemo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, Surface, Toast } from '@heroui/react'
import '../../src/styles.css'
import { AmountLinesField } from '../../src/components/AmountLinesField'
import { ReparentTargetPicker } from '../../src/components/ReparentTargetPicker'
import { AddonLineDetail } from '../../src/components/TransactionDrawer'
import { KindYen, kindTone } from '../../src/components/Amount'
import { formatDateShort, formatMonthLabel } from '../../src/lib/date'
import { initAmountLinesFromTx } from '../../src/lib/amountLines'
import { formatYen } from '../../src/lib/money'
import { notifyQueue, notifySaved } from '../../src/lib/notify'
import { computeReparentToRuleAddon, computeUndoReparentToRuleAddon } from '../../src/lib/reparentToRuleAddon'
import { filterReparentMoveCandidates } from '../../src/lib/reparentCandidates'
import type { ReparentSection } from '../../src/lib/reparentCandidates'
import {
  buildReparentRulesHarnessScenario,
  HARNESS_ANCHOR_DATE,
  HARNESS_MOVED_AMOUNT,
  HARNESS_MOVED_LABEL,
  HARNESS_SOURCE_DATE,
  HARNESS_TARGET_RULE_MONTH,
  HARNESS_HORIZON_END,
} from '../../src/lib/reparentRulesHarnessScenario'
import type { ForecastRow } from '../../src/lib/forecast'

type View =
  | 'picker-free'
  | 'picker-tab-oneoff'
  | 'picker-tab-oneoff-selected'
  | 'picker-tab-virtual-collapsed'
  | 'picker-tab-virtual-expanded'
  | 'picker-tab-confirmed'
  | 'picker-search'
  | 'before-move'
  | 'after-move'
  | 'date-warning'
  | 'undo-toast'
  | 'post-move-toast'
  | 'addon-line-detail'
  | 'after-undo'

const PICKER_VIEWS: View[] = [
  'picker-free',
  'picker-tab-oneoff',
  'picker-tab-oneoff-selected',
  'picker-tab-virtual-collapsed',
  'picker-tab-virtual-expanded',
  'picker-tab-confirmed',
  'picker-search',
  'date-warning',
]

function viewFromLocation(): View {
  const v = new URLSearchParams(window.location.search).get('view')
  const all: View[] = [
    ...PICKER_VIEWS,
    'before-move',
    'after-move',
    'undo-toast',
    'post-move-toast',
    'addon-line-detail',
    'after-undo',
  ]
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
      <Surface
        variant="secondary"
        className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-h-[85vh] min-h-[min(70vh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl px-4 pt-4 pb-0 shadow-lg"
        data-testid="harness-sheet"
      >
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
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <SourceTxnHeader
        name={sourceBefore.name}
        date={sourceBefore.date}
        amountBefore={sourceBefore.amount}
      />
      <h1 className="text-base font-semibold">別の取引へ移動</h1>
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-initial-tab={initialTab ?? 'oneoff'}
        data-initial-query={initialQuery ?? ''}
      >
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
    </div>
  )
}

function App() {
  const view = useMemo(() => viewFromLocation(), [])
  const scenario = useMemo(() => buildReparentRulesHarnessScenario(), [])

  const sourceBefore = scenario.transactionsBefore[0]!
  const sourceAfter = scenario.transactionsAfter[0]!

  useEffect(() => {
    if (view === 'post-move-toast') {
      notifySaved(`${HARNESS_MOVED_LABEL}を定期へ移動しました`)
    }
    if (view === 'undo-toast') {
      notifySaved(`${HARNESS_MOVED_LABEL}を定期へ移動しました`)
    }
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
  if (view === 'picker-tab-oneoff-selected') {
    return (
      <HarnessShell view={view}>
        <PickerHarness view={view} showRecurringSections initialTab="oneoff" />
        <SelectFirstOneoffBootstrap />
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

  if (view === 'undo-toast' || view === 'post-move-toast') {
    return (
      <HarnessShell view={view}>
        <p className="text-sm text-muted">移動完了直後のトースト（保存のみ・Undo なし）</p>
        <Button className="mt-4" variant="tertiary" onPress={() => {}}>
          ドロワーは閉じた想定
        </Button>
      </HarnessShell>
    )
  }

  if (view === 'addon-line-detail') {
    const virtualAfter = scenario.virtualRentAfter
    const addon = virtualAfter?.addons?.[0]
    if (!addon || addon.reparentOrigin === undefined) {
      return (
        <HarnessShell view={view}>
          <p className="text-sm text-danger">addon 行がありません</p>
        </HarnessShell>
      )
    }
    return (
      <HarnessShell view={view}>
        <h1 className="mb-3 text-base font-semibold">上乗せを開く</h1>
        <AddonLineDetail
          addon={addon}
          canReparent
          isPending={false}
          onBack={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onUndo={() => {}}
          onMove={() => {}}
        />
      </HarnessShell>
    )
  }

  if (view === 'after-undo') {
    const sourceBefore = scenario.transactionsBefore[0]!
    const reparent = computeReparentToRuleAddon({
      source: {
        id: sourceBefore._id,
        kind: sourceBefore.kind,
        amount: sourceBefore.amount,
        amountBreakdown: sourceBefore.amountBreakdown,
        date: sourceBefore.date,
        addon: sourceBefore.addon,
        actual: sourceBefore.actual,
        importBatchId: sourceBefore.importBatchId,
      },
      target: {
        ruleId: String(scenario.rules[0]!._id),
        ruleMonth: HARNESS_TARGET_RULE_MONTH,
        date: scenario.virtualRentBefore!.date,
      },
      index: 1,
      expectedAmount: HARNESS_MOVED_AMOUNT,
      expectedLabel: HARNESS_MOVED_LABEL,
      anchorDate: HARNESS_ANCHOR_DATE,
      horizonEnd: HARNESS_HORIZON_END,
      targetMonthHasOverride: false,
    })
    if ('error' in reparent) {
      return (
        <HarnessShell view={view}>
          <p className="text-sm text-danger">{reparent.error}</p>
        </HarnessShell>
      )
    }
    const sourceAfterMove: typeof sourceBefore = {
      ...sourceBefore,
      amount: reparent.source.amount,
      amountBreakdown:
        reparent.source.amountBreakdown !== undefined && reparent.source.amountBreakdown.length > 0
          ? reparent.source.amountBreakdown
          : undefined,
    }
    const restored = computeUndoReparentToRuleAddon({
      source: {
        id: sourceAfterMove._id,
        kind: sourceAfterMove.kind,
        amount: sourceAfterMove.amount,
        amountBreakdown: sourceAfterMove.amountBreakdown,
        date: sourceAfterMove.date,
        addon: sourceAfterMove.addon,
        actual: sourceAfterMove.actual,
        importBatchId: sourceAfterMove.importBatchId,
      },
      index: reparent.undo.sourceIndex,
      line: reparent.moved,
    })
    const sourceUndone = {
      ...sourceAfterMove,
      amount: restored.amount,
      amountBreakdown: restored.amountBreakdown,
    }
    return (
      <HarnessShell view={view}>
        <div className="flex flex-col gap-3" data-testid="after-undo-amounts">
          <p className="text-sm">
            ソース合計: <span className="tabular-nums font-medium">{formatYen(sourceUndone.amount)}</span>
          </p>
          <p className="text-sm text-muted">
            内訳2行目:{' '}
            <span className="tabular-nums">{formatYen(sourceUndone.amountBreakdown?.[1]?.amount ?? 0)}</span>
          </p>
        </div>
      </HarnessShell>
    )
  }

  return null
}

function DateWarningBootstrap() {
  useEffect(() => {
    const run = () => {
      document.querySelector<HTMLElement>('[data-testid="reparent-tab-recurring-virtual"]')?.click()
      const pick = () => {
        const card = document.querySelector<HTMLButtonElement>(
          '[data-reparent-picker] [data-rule-group] button[data-candidate-key]',
        )
        card?.click()
      }
      setTimeout(pick, 180)
    }
    const t = setTimeout(run, 100)
    return () => clearTimeout(t)
  }, [])
  return null
}

function SelectFirstOneoffBootstrap() {
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelector<HTMLButtonElement>('[data-reparent-picker] button[data-candidate-key]')?.click()
    }, 120)
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