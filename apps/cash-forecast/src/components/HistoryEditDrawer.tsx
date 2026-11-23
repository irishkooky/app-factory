import { useState, type FormEvent } from 'react'
import {
  Button,
  Drawer,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { HistoryRow } from '../lib/history'
import type { Kind } from '../lib/money'
import { notifyDeleted, notifyError, notifyMoved, notifySaved } from '../lib/notify'
import { usePlan } from './BillingControls'
import { useConfirm } from './ConfirmDialog'
import {
  initAmountLinesFromTx,
  sumAmountLines,
  toAmountBreakdown,
  type AmountLine,
} from '../lib/amountLines'
import { AmountLinesField } from './AmountLinesField'
import { ReparentTargetPicker, type ReparentCandidate } from './ReparentTargetPicker'
import { filterReparentMoveCandidates } from '../lib/reparentCandidates'
import type { Id } from '../../convex/_generated/dataModel'

type HistoryEditDrawerProps = {
  opened: boolean
  onClose: () => void
  anchorDate: string
  target: HistoryRow | null
  /** 同じ kind・履歴側の移動先候補（addon・import 除外済み） */
  reparentCandidates?: ReparentCandidate[]
}

// 実績（過去に確定した入出金）の編集専用Drawer。
// forecast の予定行とは排他（実績は過去の記録なので、ルール確定・上乗せの概念が無い）。
export function HistoryEditDrawer({
  opened,
  onClose,
  anchorDate,
  target,
  reparentCandidates = [],
}: HistoryEditDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>実績を編集</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && target && (
              <HistoryEditForm
                key={target.txId}
                anchorDate={anchorDate}
                target={target}
                onClose={onClose}
                reparentCandidates={reparentCandidates}
              />
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function HistoryEditForm({
  anchorDate,
  target,
  onClose,
  reparentCandidates,
}: {
  anchorDate: string
  target: HistoryRow
  onClose: () => void
  reparentCandidates: ReparentCandidate[]
}) {
  const updateTx = useMutation(api.transactions.update)
  const removeTx = useMutation(api.transactions.remove)
  const reparentLine = useMutation(api.transactions.reparentBreakdownLine)
  const confirm = useConfirm()

  const [submitting, setSubmitting] = useState(false)
  const [movingLine, setMovingLine] = useState<AmountLine | null>(null)
  const [date, setDate] = useState(target.date)
  const [name, setName] = useState(target.rawName ?? target.name)
  const [lines, setLines] = useState<AmountLine[]>(() =>
    initAmountLinesFromTx({ amount: target.amount, amountBreakdown: target.amountBreakdown }),
  )
  const [kind, setKind] = useState<Kind>(target.kind)
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({})

  const { plan } = usePlan()

  const kindCandidates = filterReparentMoveCandidates(reparentCandidates, {
    kind,
    sourceTxId: target.txId,
  }).filter((c) => c.targetKind === 'transaction')

  const runUndo = async (undo: {
    sourceId: Id<'transactions'>
    targetId: Id<'transactions'>
    index: number
    expectedAmount: number
    expectedLabel?: string
  }) => {
    try {
      await reparentLine({
        sourceId: undo.sourceId,
        targetId: undo.targetId,
        index: undo.index,
        expectedAmount: undo.expectedAmount,
        expectedLabel: undo.expectedLabel,
      })
      notifySaved('元に戻しました')
    } catch (err) {
      notifyError(err, '元に戻せませんでした')
    }
  }

  const handleReparent = async (targetId: Id<'transactions'>) => {
    if (movingLine?.serverIndex === undefined || target.isAddon) return
    const breakdown = target.amountBreakdown
    if (breakdown === undefined || breakdown.length < 2) return
    const serverEntry = breakdown[movingLine.serverIndex]
    if (serverEntry === undefined) {
      notifyError(new Error('内訳の行が見つかりません'), '移動に失敗しました')
      return
    }

    setSubmitting(true)
    try {
      const result = await reparentLine({
        sourceId: target.txId,
        targetId,
        index: movingLine.serverIndex,
        expectedAmount: serverEntry.amount,
        expectedLabel: serverEntry.label,
      })
      const label =
        movingLine.label !== '' ? movingLine.label : `項目${movingLine.serverIndex + 1}`
      notifyMoved(`${label}を移動しました`, {
        description: result.dateChanged
          ? '途中の残高・最低残高が変わっている場合があります（最終残高は同じ）。'
          : undefined,
        onUndo: () => {
          void runUndo(result.undo)
        },
      })
      onClose()
    } catch (err) {
      notifyError(err, '移動に失敗しました')
      setSubmitting(false)
    }
  }

  if (movingLine !== null && !target.isAddon) {
    return (
      <ReparentTargetPicker
        candidates={kindCandidates}
        sourceDate={target.date}
        lineLabel={movingLine.label !== '' ? movingLine.label : `項目${(movingLine.serverIndex ?? 0) + 1}`}
        lineAmount={movingLine.value ?? 0}
        kind={kind}
        isPending={submitting}
        showRecurringSections={plan === 'pro'}
        onSelect={(id) => {
          void handleReparent(id)
        }}
        onCancel={() => setMovingLine(null)}
      />
    )
  }

  const handleNameChange = (v: string) => {
    setName(v)
    if (v.trim().length > 0) setErrors((prev) => (prev.name ? { ...prev, name: undefined } : prev))
  }

  const handleLinesChange = (next: AmountLine[]) => {
    setLines(next)
    if (sumAmountLines(next) !== undefined) {
      setErrors((prev) => (prev.amount ? { ...prev, amount: undefined } : prev))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const total = sumAmountLines(lines)
    const nextErrors: typeof errors = {}
    // アドオン由来の実績行は名前が無くてよい（サーバー側もアドオン行の空名を許容済み）。
    if (!target.isAddon && name.trim().length === 0) nextErrors.name = '名前を入力してください'
    if (total === undefined) nextErrors.amount = '金額を入力してください'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || total === undefined) return

    setSubmitting(true)
    try {
      const roundedAmount = Math.round(total)
      await updateTx({
        id: target.txId,
        date,
        name,
        kind,
        amount: roundedAmount,
        // update では省略が「触らない」なので、内訳なしは [] で明示クリアする
        amountBreakdown: toAmountBreakdown(lines) ?? [],
      })
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: '削除の確認',
      description: 'この実績を削除しますか？',
      confirmLabel: '削除',
      isDestructive: true,
    })
    if (!ok) return
    setSubmitting(true)
    try {
      await removeTx({ id: target.txId })
      notifyDeleted()
      onClose()
    } catch (err) {
      notifyError(err, '削除に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        日付
        <input
          type="date"
          max={anchorDate}
          disabled={submitting}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>

      <TextField isInvalid={!!errors.name} isDisabled={submitting}>
        <Label>名前</Label>
        <Input placeholder="例: 家賃" value={name} onChange={(e) => handleNameChange(e.target.value)} />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </TextField>

      <AmountLinesField
        lines={lines}
        onChange={handleLinesChange}
        kind={kind}
        error={errors.amount}
        isDisabled={submitting}
        onMoveLine={target.isAddon ? undefined : (line) => setMovingLine(line)}
      />

      <ToggleButtonGroup
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[kind]}
        onSelectionChange={(keys) => {
          const value = Array.from(keys)[0]
          if (value === 'income' || value === 'expense') setKind(value)
        }}
        isDisabled={submitting}
      >
        <ToggleButton id="expense">支出</ToggleButton>
        <ToggleButton id="income">
          <ToggleButtonGroup.Separator />
          収入
        </ToggleButton>
      </ToggleButtonGroup>

      <div className="mt-2 flex justify-between">
        <Button variant="danger-soft" onPress={handleDelete} isDisabled={submitting}>
          削除
        </Button>
        <Button type="submit" isPending={submitting} isDisabled={submitting}>
          {submitting && <Spinner color="current" size="sm" />}
          保存
        </Button>
      </div>
    </form>
  )
}
