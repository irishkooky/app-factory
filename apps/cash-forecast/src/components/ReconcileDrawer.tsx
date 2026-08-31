import { useMemo, useState, type FormEvent } from 'react'
import { Button, Checkbox, Drawer, FieldError, Label, NumberField, Separator, Spinner } from '@heroui/react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { ForecastRow } from '../lib/forecast'
import { todayJST } from '../lib/date'
import { formatYen } from '../lib/money'
import { notifyError, notifySaved } from '../lib/notify'

type ReconcileDrawerProps = {
  opened: boolean
  onClose: () => void
  currentBalance: number
  anchorDate: string // key={anchorDate} で使う。基準日が変わるたびフォーム状態をリセットするため
  anchorBalance: number
  pendingRows: ForecastRow[]
}

export function ReconcileDrawer({
  opened,
  onClose,
  currentBalance,
  anchorDate,
  anchorBalance,
  pendingRows,
}: ReconcileDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>残高を合わせる</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && (
              <ManualReconcileForm
                key={anchorDate}
                currentBalance={currentBalance}
                anchorBalance={anchorBalance}
                pendingRows={pendingRows}
                onClose={onClose}
              />
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

type ReconcileOp =
  | {
      type: 'materializeRule'
      ruleId: Id<'rules'>
      ruleMonth: string
      date: string
      name: string
      kind: 'income' | 'expense'
      amount: number
    }
  | { type: 'confirmTx'; txId: Id<'transactions'> }
  | { type: 'insertActual'; date: string; name: string; kind: 'income' | 'expense'; amount: number }

function signed(kind: 'income' | 'expense', amount: number): number {
  return kind === 'income' ? amount : -amount
}

function ManualReconcileForm({
  currentBalance,
  anchorBalance,
  pendingRows,
  onClose,
}: {
  currentBalance: number
  anchorBalance: number
  pendingRows: ForecastRow[]
  onClose: () => void
}) {
  const commit = useMutation(api.reconcile.commit)
  const [submitting, setSubmitting] = useState(false)
  const [balance, setBalance] = useState<number | undefined>(currentBalance)
  const [error, setError] = useState<string | null>(null)
  const [adjustChecked, setAdjustChecked] = useState(true)

  const newAnchorDate = todayJST()

  // pendingRows は全行を暗黙的に「実績にする」扱いで反映する（行ごとの選択UIは撤去済み）。
  const reflectedBalance = useMemo(() => {
    let total = anchorBalance
    for (const row of pendingRows) {
      total += signed(row.kind, row.amount)
    }
    return total
  }, [pendingRows, anchorBalance])

  const diff = balance !== undefined ? Math.round(balance) - reflectedBalance : 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (balance === undefined) {
      setError('残高を入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const roundedBalance = Math.round(balance)
      const finalDiff = roundedBalance - reflectedBalance

      const ops: ReconcileOp[] = []
      for (const row of pendingRows) {
        if (row.isVirtual) {
          if (row.ruleId === undefined || row.ruleMonth === undefined) continue
          ops.push({
            type: 'materializeRule',
            ruleId: row.ruleId,
            ruleMonth: row.ruleMonth,
            date: row.date,
            name: row.name,
            kind: row.kind,
            amount: row.amount,
          })
        } else if (row.txId !== undefined) {
          ops.push({ type: 'confirmTx', txId: row.txId })
        }
      }

      if (finalDiff !== 0 && adjustChecked) {
        ops.push({
          type: 'insertActual',
          date: newAnchorDate,
          name: '残高調整',
          kind: finalDiff > 0 ? 'income' : 'expense',
          amount: Math.abs(finalDiff),
        })
      }

      await commit({
        newAnchorDate,
        newAnchorBalance: roundedBalance,
        batchId: crypto.randomUUID(),
        ops,
      })
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, '残高の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        銀行口座の現在残高を入力してください。過去の予定は実績として記録されます。
      </p>

      <Separator />

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">反映後残高</span>
          <span className="tabular-nums">{formatYen(reflectedBalance)}</span>
        </div>
        {diff !== 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted">ズレ</span>
            <span className={`tabular-nums ${diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {diff > 0 ? '+' : ''}
              {formatYen(diff)}
            </span>
          </div>
        )}
      </div>

      <NumberField
        isInvalid={error !== null}
        isDisabled={submitting}
        minValue={-1_000_000_000}
        maxValue={1_000_000_000}
        value={balance}
        onChange={setBalance}
        formatOptions={{ style: 'currency', currency: 'JPY' }}
      >
        <Label>現在残高</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="flex-1" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {error && <FieldError>{error}</FieldError>}
      </NumberField>

      {diff !== 0 && (
        <Checkbox isSelected={adjustChecked} onChange={setAdjustChecked} isDisabled={submitting}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            差額 {formatYen(Math.abs(diff))} を「残高調整」として記録する
          </Checkbox.Content>
        </Checkbox>
      )}

      <Button type="submit" isPending={submitting} isDisabled={submitting}>
        {submitting && <Spinner color="current" size="sm" />}
        保存
      </Button>
    </form>
  )
}
