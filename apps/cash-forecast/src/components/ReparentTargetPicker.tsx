import { useMemo, useState } from 'react'
import { Button, Input, Label, TextField, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import type { Id } from '../../convex/_generated/dataModel'
import { formatDateShort } from '../lib/date'
import { formatYen, type Kind } from '../lib/money'
import type { ReparentCandidate, ReparentRuleMonthTarget, ReparentSection } from '../lib/reparentCandidates'
import {
  candidateKey,
  displayTitle,
  oneoffCandidatesForTab,
  recurringCandidatesForTab,
  REPARENT_PICKER_SECTIONS,
} from '../lib/reparentPickerLayout'

export type { ReparentCandidate } from '../lib/reparentCandidates'

type Selection =
  | { kind: 'transaction'; txId: Id<'transactions'> }
  | { kind: 'rule-month'; ruleId: Id<'rules'>; ruleMonth: string }

type ReparentTargetPickerProps = {
  candidates: ReparentCandidate[]
  sourceDate: string
  lineLabel: string
  lineAmount: number
  kind: Kind
  isPending?: boolean
  /** false のとき定期タブを出さない（単発のみ） */
  showRecurringSections?: boolean
  defaultTab?: ReparentSection
  initialQuery?: string
  onSelect: (targetId: Id<'transactions'>) => void
  onSelectRuleMonth?: (target: ReparentRuleMonthTarget) => void
  onCancel: () => void
}

function selectionKey(sel: Selection | null): string | null {
  if (sel === null) return null
  if (sel.kind === 'transaction') return `tx:${sel.txId}`
  return `rule:${sel.ruleId}:${sel.ruleMonth}`
}

function selectFromCandidate(c: ReparentCandidate, setSelection: (s: Selection) => void) {
  if (c.targetKind === 'transaction') {
    setSelection({ kind: 'transaction', txId: c.txId })
  } else {
    setSelection({ kind: 'rule-month', ruleId: c.ruleId, ruleMonth: c.ruleMonth })
  }
}

function CandidateCard({
  c,
  isSelected,
  isPending,
  onSelect,
}: {
  c: ReparentCandidate
  isSelected: boolean
  isPending?: boolean
  onSelect: () => void
}) {
  const title = displayTitle(c)
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onSelect}
      data-candidate-key={candidateKey(c)}
      className={`flex min-h-[5.5rem] w-full flex-col justify-between gap-2 rounded-2xl border-2 p-3 text-left transition-colors ${
        isSelected
          ? 'border-accent bg-accent/10 shadow-sm ring-2 ring-accent/40'
          : 'border-default-200 bg-surface-secondary hover:border-default-300 hover:bg-surface-tertiary'
      }`}
    >
      <span className="line-clamp-2 text-sm font-semibold leading-snug">{title}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-lg font-bold tabular-nums">{formatYen(c.amount)}</span>
        <span className="text-sm tabular-nums text-muted">{formatDateShort(c.date)}</span>
      </div>
    </button>
  )
}

/**
 * 内訳行の移動先ピッカー。名前・日付で絞り込み。
 * 日付が違う候補を選ぶと、途中残高への影響を警告する。
 */
export function ReparentTargetPicker({
  candidates,
  sourceDate,
  lineLabel,
  lineAmount,
  kind: _kind,
  isPending,
  showRecurringSections = true,
  defaultTab = 'oneoff',
  initialQuery = '',
  onSelect,
  onSelectRuleMonth,
  onCancel,
}: ReparentTargetPickerProps) {
  const [query, setQuery] = useState(initialQuery)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [activeTab, setActiveTab] = useState<ReparentSection>(defaultTab)
  const [expandedRules, setExpandedRules] = useState<Set<string>>(() => new Set())

  const tabs = useMemo(() => {
    if (showRecurringSections) return REPARENT_PICKER_SECTIONS
    return REPARENT_PICKER_SECTIONS.filter((t) => !t.proOnly)
  }, [showRecurringSections])

  const oneoffList = useMemo(
    () => oneoffCandidatesForTab(candidates, sourceDate, query),
    [candidates, sourceDate, query],
  )

  const virtualGroups = useMemo(
    () =>
      recurringCandidatesForTab(candidates, 'recurring-virtual', sourceDate, query, expandedRules),
    [candidates, sourceDate, query, expandedRules],
  )

  const confirmedGroups = useMemo(
    () =>
      recurringCandidatesForTab(candidates, 'recurring-confirmed', sourceDate, query, expandedRules),
    [candidates, sourceDate, query, expandedRules],
  )

  const selectedCandidate = useMemo(() => {
    if (selection === null) return undefined
    const key = selectionKey(selection)
    return candidates.find((c) => candidateKey(c) === key)
  }, [candidates, selection])

  const dateChanged = selectedCandidate !== undefined && selectedCandidate.date !== sourceDate
  const ruleMonthTarget =
    selection?.kind === 'rule-month'
      ? {
          ruleId: selection.ruleId,
          ruleMonth: selection.ruleMonth,
          date: selectedCandidate?.date ?? sourceDate,
        }
      : undefined

  const canConfirm =
    selection !== null &&
    !isPending &&
    (selection.kind === 'transaction' ||
      (selection.kind === 'rule-month' && onSelectRuleMonth !== undefined))

  const tabEmpty =
    (activeTab === 'oneoff' && oneoffList.length === 0) ||
    (activeTab === 'recurring-virtual' && virtualGroups.every((g) => g.visibleItems.length === 0)) ||
    (activeTab === 'recurring-confirmed' && confirmedGroups.every((g) => g.visibleItems.length === 0))

  return (
    <div className="flex flex-col gap-4" data-reparent-picker>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">移動する項目</p>
        <p className="text-sm font-medium">
          {lineLabel}
          <span className="ml-2 tabular-nums text-muted">{formatYen(lineAmount)}</span>
        </p>
      </div>

      <TextField isDisabled={isPending}>
        <Label>移動先を検索</Label>
        <Input
          placeholder="名前または日付"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </TextField>

      {tabs.length > 1 && (
        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={new Set([activeTab])}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0]
            if (
              value === 'oneoff' ||
              value === 'recurring-virtual' ||
              value === 'recurring-confirmed'
            ) {
              setActiveTab(value)
            }
          }}
          isDisabled={isPending}
          className="w-full"
        >
          {tabs.map((tab, i) => (
            <span key={tab.id} className="contents">
              {i > 0 ? <ToggleButtonGroup.Separator /> : null}
              <ToggleButton
                id={tab.id}
                data-testid={`reparent-tab-${tab.id}`}
                className="flex-1 text-sm"
              >
                {tab.title}
              </ToggleButton>
            </span>
          ))}
        </ToggleButtonGroup>
      )}

      <div className="max-h-[min(24rem,55vh)] overflow-y-auto">
        {tabEmpty ? (
          <p className="py-6 text-center text-sm text-muted">該当する取引がありません</p>
        ) : activeTab === 'oneoff' ? (
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            {oneoffList.map((c) => (
              <CandidateCard
                key={candidateKey(c)}
                c={c}
                isSelected={selectionKey(selection) === candidateKey(c)}
                isPending={isPending}
                onSelect={() => selectFromCandidate(c, setSelection)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {(activeTab === 'recurring-virtual' ? virtualGroups : confirmedGroups).map((group) => (
              <section key={group.ruleId} className="flex flex-col gap-2" data-rule-group={group.ruleId}>
                <h3 className="px-1 text-sm font-semibold text-foreground">{group.ruleName}</h3>
                <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                  {group.visibleItems.map((c) => (
                    <CandidateCard
                      key={candidateKey(c)}
                      c={c}
                      isSelected={selectionKey(selection) === candidateKey(c)}
                      isPending={isPending}
                      onSelect={() => selectFromCandidate(c, setSelection)}
                    />
                  ))}
                </div>
                {group.hiddenCount > 0 ? (
                  <Button
                    variant="tertiary"
                    size="sm"
                    className="self-start"
                    onPress={() =>
                      setExpandedRules((prev) => {
                        const next = new Set(prev)
                        next.add(group.ruleId)
                        return next
                      })
                    }
                  >
                    もっと見る（あと{group.hiddenCount}件）
                  </Button>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>

      {dateChanged && (
        <p className="text-sm text-warning" role="status">
          {selection?.kind === 'rule-month'
            ? 'ルール発生日と違うため、それまでの途中残高・最低残高が変わります（最終残高は同じことが多いです）。'
            : '日付が違うため、途中の残高・最低残高が変わります（最終残高は同じです）。'}
        </p>
      )}

      <div className="mt-2 flex justify-between">
        <Button variant="tertiary" onPress={onCancel} isDisabled={isPending}>
          キャンセル
        </Button>
        <Button
          onPress={() => {
            if (selection?.kind === 'transaction') {
              onSelect(selection.txId)
            } else if (selection?.kind === 'rule-month' && ruleMonthTarget !== undefined) {
              onSelectRuleMonth?.(ruleMonthTarget)
            }
          }}
          isDisabled={!canConfirm}
          isPending={isPending}
        >
          移動する
        </Button>
      </div>
    </div>
  )
}