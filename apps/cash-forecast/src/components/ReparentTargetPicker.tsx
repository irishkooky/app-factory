import { useMemo, useState } from 'react'
import { Button, Input, Label, TextField } from '@heroui/react'
import type { Id } from '../../convex/_generated/dataModel'
import { formatDateShort, formatMonthLabel } from '../lib/date'
import { formatYen, type Kind } from '../lib/money'
import type { ReparentCandidate, ReparentRuleMonthTarget, ReparentSection } from '../lib/reparentCandidates'

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
  /** false のとき定期セクション（未確定・確定済み）を出さない */
  showRecurringSections?: boolean
  onSelect: (targetId: Id<'transactions'>) => void
  onSelectRuleMonth?: (target: ReparentRuleMonthTarget) => void
  onCancel: () => void
}

const SECTION_META: { id: ReparentSection; title: string; proOnly?: boolean }[] = [
  { id: 'oneoff', title: '単発の取引' },
  { id: 'recurring-virtual', title: '定期（未確定の月）', proOnly: true },
  { id: 'recurring-confirmed', title: '定期（確定済み）', proOnly: true },
]

function selectionKey(sel: Selection | null): string | null {
  if (sel === null) return null
  if (sel.kind === 'transaction') return `tx:${sel.txId}`
  return `rule:${sel.ruleId}:${sel.ruleMonth}`
}

function candidateKey(c: ReparentCandidate): string {
  if (c.targetKind === 'transaction') return `tx:${c.txId}`
  return `rule:${c.ruleId}:${c.ruleMonth}`
}

function displayTitle(c: ReparentCandidate): string {
  if (c.section === 'recurring-confirmed' && c.ruleName !== undefined && c.ruleMonth !== undefined) {
    return `${c.ruleName}（${formatMonthLabel(c.ruleMonth)}）`
  }
  if (c.section === 'recurring-virtual' && c.ruleMonth !== undefined) {
    return `${c.ruleName ?? c.name}（${formatMonthLabel(c.ruleMonth)}）`
  }
  return c.name
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
  onSelect,
  onSelectRuleMonth,
  onCancel,
}: ReparentTargetPickerProps) {
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<Selection | null>(null)

  const visibleSections = useMemo(() => {
    if (showRecurringSections) return SECTION_META
    return SECTION_META.filter((s) => !s.proOnly)
  }, [showRecurringSections])

  const filteredBySection = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (c: ReparentCandidate) => {
      if (q === '') return true
      const title = displayTitle(c).toLowerCase()
      return (
        title.includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.date.includes(q) ||
        formatDateShort(c.date).includes(q) ||
        (c.ruleMonth !== undefined && formatMonthLabel(c.ruleMonth).includes(q))
      )
    }

    const sortList = (list: ReparentCandidate[]) =>
      [...list].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1
        return displayTitle(a).localeCompare(displayTitle(b), 'ja')
      })

    const buckets = new Map<ReparentSection, ReparentCandidate[]>()
    for (const meta of visibleSections) {
      buckets.set(meta.id, [])
    }
    for (const c of candidates) {
      if (!buckets.has(c.section)) continue
      if (!match(c)) continue
      buckets.get(c.section)!.push(c)
    }
    for (const [key, list] of buckets) {
      buckets.set(key, sortList(list))
    }
    return buckets
  }, [candidates, query, visibleSections])

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

  const totalVisible = visibleSections.reduce(
    (n, meta) => n + (filteredBySection.get(meta.id)?.length ?? 0),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
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

      <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
        {totalVisible === 0 ? (
          <p className="py-4 text-center text-sm text-muted">該当する取引がありません</p>
        ) : (
          visibleSections.map((meta) => {
            const list = filteredBySection.get(meta.id) ?? []
            if (list.length === 0) return null
            return (
              <section key={meta.id} className="flex flex-col gap-1">
                <h3 className="px-1 text-xs font-semibold tracking-wide text-muted uppercase">
                  {meta.title}
                </h3>
                {list.map((c) => {
                  const key = candidateKey(c)
                  const isSelected = selectionKey(selection) === key
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (c.targetKind === 'transaction') {
                          setSelection({ kind: 'transaction', txId: c.txId })
                        } else {
                          setSelection({
                            kind: 'rule-month',
                            ruleId: c.ruleId,
                            ruleMonth: c.ruleMonth,
                          })
                        }
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-accent/15 ring-1 ring-accent'
                          : 'bg-surface-secondary hover:bg-surface-tertiary'
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium">{displayTitle(c)}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {formatDateShort(c.date)} · {formatYen(c.amount)}
                      </span>
                    </button>
                  )
                })}
              </section>
            )
          })
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