import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, Surface, Toast } from '@heroui/react'
import '../../src/styles.css'
import { AmountLinesField } from '../../src/components/AmountLinesField'
import { ReparentTargetPicker } from '../../src/components/ReparentTargetPicker'
import { KindYen, kindTone } from '../../src/components/Amount'
import {
  initAmountLinesFromTx,
  type AmountLine,
} from '../../src/lib/amountLines'
import { formatYen } from '../../src/lib/money'
import { notifyMoved, notifyQueue } from '../../src/lib/notify'
import {
  buildHarnessCandidates,
  buildHarnessForecast,
  harnessTransactionsAfter,
  harnessTransactionsBefore,
} from './fixtures'
type View =
  | 'picker-pro'
  | 'picker-free'
  | 'before-move'
  | 'after-move'
  | 'date-warning'
  | 'undo-toast'

function viewFromLocation(): View {
  const v = new URLSearchParams(window.location.search).get('view')
  if (
    v === 'picker-pro' ||
    v === 'picker-free' ||
    v === 'before-move' ||
    v === 'after-move' ||
    v === 'date-warning' ||
    v === 'undo-toast'
  ) {
    return v
  }
  return 'picker-pro'
}

function HarnessShell({ view, children }: { view: View; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg p-4" data-view={view}>
      <Toast.Provider placement="top" queue={notifyQueue} />
      <Surface variant="secondary" className="rounded-2xl p-4 shadow-sm">
        {children}
      </Surface>
    </div>
  )
}

function RuleMonthPreview() {
  const forecast = buildHarnessForecast(harnessTransactionsAfter())
  const row = forecast.find((r) => r.ruleMonth === '2026-11' && r.isVirtual)
  if (!row) return <p className="text-sm text-muted">仮想行が見つかりません</p>
  const baseAmount = row.baseAmount ?? row.amount

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted">定期（未確定）— 家賃（2026年11月）</p>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">合計</span>
        <span className={`text-2xl font-bold tabular-nums ${kindTone(row.kind)}`}>
          <KindYen kind={row.kind} amount={row.amount} />
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="text-sm text-muted">ベース（ルール平均）</span>
          <span className="text-sm tabular-nums">{formatYen(baseAmount)}</span>
        </div>
        {(row.addons ?? []).map((addon) => (
          <div key={addon.txId} className="flex items-center justify-between gap-2">
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

function App() {
  const view = useMemo(() => viewFromLocation(), [])
  const candidates = useMemo(() => buildHarnessCandidates(harnessTransactionsBefore), [])
  const expenseCandidates = candidates.filter((c) => c.kind === 'expense')

  const [movingLine] = useState<AmountLine | null>(() => {
    const lines = initAmountLinesFromTx({
      amount: 54_000,
      amountBreakdown: [
        { amount: 50_000, label: '生活費' },
        { amount: 4_000, label: '繰越分' },
      ],
    })
    return lines.find((l) => l.label === '繰越分') ?? null
  })

  useEffect(() => {
    if (view !== 'undo-toast') return
    notifyMoved('繰越分を定期へ移動しました', {
      description:
        'ルール発生日と違うため、それまでの途中残高・最低残高が変わっている場合があります（最終残高は同じことが多いです）。',
      onUndo: () => {},
    })
  }, [view])

  if (view === 'picker-pro' || view === 'picker-free' || view === 'date-warning') {
    return (
      <HarnessShell view={view}>
        <h1 className="mb-3 text-base font-semibold">別の取引へ移動</h1>
        <ReparentTargetPicker
          candidates={expenseCandidates}
          sourceDate="2026-04-10"
          lineLabel="繰越分"
          lineAmount={4_000}
          kind="expense"
          showRecurringSections={view !== 'picker-free'}
          onSelect={() => {}}
          onSelectRuleMonth={() => {}}
          onCancel={() => {}}
        />
        {view === 'date-warning' ? <DateWarningBootstrap /> : null}
      </HarnessShell>
    )
  }

  if (view === 'before-move') {
    const lines = initAmountLinesFromTx({
      amount: 54_000,
      amountBreakdown: [
        { amount: 50_000, label: '生活費' },
        { amount: 4_000, label: '繰越分' },
      ],
    })
    return (
      <HarnessShell view={view}>
        <h1 className="mb-3 text-base font-semibold">取引を編集（移動前）</h1>
        <AmountLinesField lines={lines} onChange={() => {}} kind="expense" onMoveLine={() => {}} />
      </HarnessShell>
    )
  }

  if (view === 'after-move') {
    const lines = initAmountLinesFromTx({
      amount: 50_000,
      amountBreakdown: [{ amount: 50_000, label: '生活費' }],
    })
    return (
      <HarnessShell view={view}>
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 text-base font-semibold">移動後：ソース取引</h2>
            <AmountLinesField lines={lines} onChange={() => {}} kind="expense" onMoveLine={() => {}} />
          </section>
          <section className="border-t border-default-200 pt-4">
            <h2 className="mb-2 text-base font-semibold">移動後：未確定ルール月</h2>
            <RuleMonthPreview />
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

/** 日付警告が見えるよう、定期・未確定の11月を自動選択 */
function DateWarningBootstrap() {
  useEffect(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const target = buttons.find((b) => b.textContent?.includes('2026年11月'))
    target?.click()
  }, [])
  return null
}

createRoot(document.getElementById('root')!).render(<App />)