import { useMemo, useState } from 'react'
import { Button, Input, Label, TextField } from '@heroui/react'
import type { Id } from '../../convex/_generated/dataModel'
import { formatDateShort } from '../lib/date'
import { formatYen, type Kind } from '../lib/money'

export type ReparentCandidate = {
  txId: Id<'transactions'>
  name: string
  date: string
  kind: Kind
  amount: number
}

type ReparentTargetPickerProps = {
  candidates: ReparentCandidate[]
  sourceDate: string
  lineLabel: string
  lineAmount: number
  kind: Kind
  isPending?: boolean
  onSelect: (targetId: Id<'transactions'>) => void
  onCancel: () => void
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
  onSelect,
  onCancel,
}: ReparentTargetPickerProps) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<Id<'transactions'> | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...candidates].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      return a.name.localeCompare(b.name, 'ja')
    })
    if (q === '') return list
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.date.includes(q) ||
        formatDateShort(c.date).includes(q),
    )
  }, [candidates, query])

  const selected = selectedId !== null ? candidates.find((c) => c.txId === selectedId) : undefined
  const dateChanged = selected !== undefined && selected.date !== sourceDate

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

      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">該当する取引がありません</p>
        ) : (
          filtered.map((c) => {
            const isSelected = selectedId === c.txId
            return (
              <button
                key={c.txId}
                type="button"
                disabled={isPending}
                onClick={() => setSelectedId(c.txId)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  isSelected ? 'bg-accent/15 ring-1 ring-accent' : 'bg-surface-secondary hover:bg-surface-tertiary'
                }`}
              >
                <span className="min-w-0 truncate font-medium">{c.name}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatDateShort(c.date)} · {formatYen(c.amount)}
                </span>
              </button>
            )
          })
        )}
      </div>

      {dateChanged && (
        <p className="text-sm text-warning" role="status">
          日付が違うため、途中の残高・最低残高が変わります（最終残高は同じです）。
        </p>
      )}

      <div className="mt-2 flex justify-between">
        <Button variant="tertiary" onPress={onCancel} isDisabled={isPending}>
          キャンセル
        </Button>
        <Button
          onPress={() => {
            if (selectedId !== null) onSelect(selectedId)
          }}
          isDisabled={selectedId === null || isPending}
          isPending={isPending}
        >
          移動する
        </Button>
      </div>
    </div>
  )
}
