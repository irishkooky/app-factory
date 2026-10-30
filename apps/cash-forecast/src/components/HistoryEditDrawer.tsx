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
import { notifyDeleted, notifyError, notifySaved } from '../lib/notify'
import { useConfirm } from './ConfirmDialog'
import {
  initAmountLinesFromTx,
  sumAmountLines,
  toAmountBreakdown,
  type AmountLine,
} from '../lib/amountLines'
import { AmountLinesField } from './AmountLinesField'

type HistoryEditDrawerProps = {
  opened: boolean
  onClose: () => void
  anchorDate: string
  target: HistoryRow | null
}

// 実績（過去に確定した入出金）の編集専用Drawer。
// forecast の予定行とは排他（実績は過去の記録なので、ルール確定・上乗せの概念が無い）。
export function HistoryEditDrawer({ opened, onClose, anchorDate, target }: HistoryEditDrawerProps) {
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
              <HistoryEditForm key={target.txId} anchorDate={anchorDate} target={target} onClose={onClose} />
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
}: {
  anchorDate: string
  target: HistoryRow
  onClose: () => void
}) {
  const updateTx = useMutation(api.transactions.update)
  const removeTx = useMutation(api.transactions.remove)
  const confirm = useConfirm()

  const [submitting, setSubmitting] = useState(false)
  const [date, setDate] = useState(target.date)
  const [name, setName] = useState(target.rawName ?? target.name)
  const [lines, setLines] = useState<AmountLine[]>(() =>
    initAmountLinesFromTx({ amount: target.amount, amountBreakdown: target.amountBreakdown }),
  )
  const [kind, setKind] = useState<Kind>(target.kind)
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({})

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

      <AmountLinesField
        header={
          <TextField isInvalid={!!errors.name} isDisabled={submitting}>
            <Label>名前</Label>
            <Input
              className="text-base font-semibold"
              placeholder="例: 家賃"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </TextField>
        }
        lines={lines}
        onChange={handleLinesChange}
        error={errors.amount}
        isDisabled={submitting}
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
