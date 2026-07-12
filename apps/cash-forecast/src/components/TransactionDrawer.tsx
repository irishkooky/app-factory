import { useState } from 'react'
import {
  Alert,
  Button,
  Drawer,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { ForecastRow } from '../lib/forecast'
import { addDays } from '../lib/date'

type TransactionDrawerProps = {
  opened: boolean
  onClose: () => void
  anchorDate: string
  today: string
  target: ForecastRow | null
}

function titleFor(target: ForecastRow | null): string {
  if (!target) return '取引を追加'
  if (target.isVirtual) return '予定を確定'
  return '取引を編集'
}

export function TransactionDrawer({ opened, onClose, anchorDate, today, target }: TransactionDrawerProps) {
  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" title={titleFor(target)} size="md">
      {opened && (
        <TransactionForm
          key={target?.key ?? 'new'}
          anchorDate={anchorDate}
          today={today}
          target={target}
          onClose={onClose}
        />
      )}
    </Drawer>
  )
}

function TransactionForm({
  anchorDate,
  today,
  target,
  onClose,
}: {
  anchorDate: string
  today: string
  target: ForecastRow | null
  onClose: () => void
}) {
  const createTx = useMutation(api.transactions.create)
  const updateTx = useMutation(api.transactions.update)
  const removeTx = useMutation(api.transactions.remove)

  const minDate = addDays(anchorDate, 1)
  const initialDate = target?.date ?? (today > minDate ? today : minDate)

  const [date, setDate] = useState(initialDate)
  const [name, setName] = useState(target?.name ?? '')
  const [amount, setAmount] = useState<number | string>(target?.amount ?? '')
  const [kind, setKind] = useState<'income' | 'expense'>(target?.kind ?? 'expense')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfirm = target?.isVirtual === true
  const isEdit = target !== null && !target.isVirtual
  const isRuleBacked = isEdit && target?.ruleId !== undefined

  const handleSubmit = async () => {
    if (name.trim().length === 0) {
      setError('名前を入力してください')
      return
    }
    if (typeof amount !== 'number') {
      setError('金額を入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const roundedAmount = Math.round(amount)
      if (isEdit && target?.txId) {
        await updateTx({ id: target.txId, date, name, kind, amount: roundedAmount })
      } else if (isConfirm && target) {
        await createTx({
          date,
          name,
          kind,
          amount: roundedAmount,
          ruleId: target.ruleId,
          ruleMonth: target.ruleMonth,
        })
      } else {
        await createTx({ date, name, kind, amount: roundedAmount })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!target?.txId) return
    const message = isRuleBacked
      ? 'この確定を取り消して予定に戻しますか？'
      : 'この取引を削除しますか？'
    if (!window.confirm(message)) return
    setError(null)
    setSubmitting(true)
    try {
      await removeTx({ id: target.txId })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      {isConfirm && (
        <Text size="sm" c="dimmed">
          金額を実際の請求額に直して保存してください。
        </Text>
      )}

      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <TextInput
        type="date"
        label="日付"
        value={date}
        min={minDate}
        onChange={(event) => setDate(event.currentTarget.value)}
        disabled={submitting}
      />

      <TextInput
        label="名前"
        placeholder="例: 家賃"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        disabled={submitting}
      />

      <NumberInput
        label="金額"
        placeholder="0"
        value={amount}
        onChange={setAmount}
        thousandSeparator=","
        hideControls
        min={0}
        max={1_000_000_000}
        prefix="¥"
        inputMode="numeric"
        disabled={submitting}
      />

      <SegmentedControl
        value={kind}
        onChange={(value) => setKind(value as 'income' | 'expense')}
        disabled={submitting}
        data={[
          { label: '支出', value: 'expense' },
          { label: '収入', value: 'income' },
        ]}
      />

      <Group justify="space-between" mt="md">
        {isEdit ? (
          <Button variant="subtle" color="red" onClick={handleDelete} disabled={submitting}>
            {isRuleBacked ? '予定に戻す' : '削除'}
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
          保存
        </Button>
      </Group>
    </Stack>
  )
}
