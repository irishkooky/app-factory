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
import type { AddonInfo, ForecastRow } from '../lib/forecast'
import { addDays, formatDateShort, formatMonthLabel } from '../lib/date'
import { formatYen } from '../lib/money'

type TransactionDrawerProps = {
  opened: boolean
  onClose: () => void
  anchorDate: string
  today: string
  target: ForecastRow | null
}

function titleFor(target: ForecastRow | null): string {
  if (!target) return '取引を追加'
  if (target.isVirtual) {
    const month = target.ruleMonth ? formatMonthLabel(target.ruleMonth) : ''
    return `${target.name}（${month}・${formatDateShort(target.date)}）`
  }
  return '取引を編集'
}

export function TransactionDrawer({ opened, onClose, anchorDate, today, target }: TransactionDrawerProps) {
  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" title={titleFor(target)} size="md">
      {opened &&
        (target?.isVirtual ? (
          <RuleMonthDetail key={target.key} target={target} anchorDate={anchorDate} onClose={onClose} />
        ) : (
          <TransactionForm
            key={target?.key ?? 'new'}
            anchorDate={anchorDate}
            today={today}
            target={target}
            onClose={onClose}
          />
        ))}
    </Drawer>
  )
}

// ルール月の詳細ビュー（仮想行クリック時）。
// 「合算内訳の閲覧 / 上乗せの追加・編集・削除 / この月の請求額を確定」をこの中で完結させる。
function RuleMonthDetail({
  target,
  anchorDate,
  onClose,
}: {
  target: ForecastRow
  anchorDate: string
  onClose: () => void
}) {
  const [mode, setMode] = useState<'detail' | 'confirm' | 'addon-add'>('detail')
  const [editingAddon, setEditingAddon] = useState<AddonInfo | null>(null)
  const removeTx = useMutation(api.transactions.remove)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteAddon = async (addon: AddonInfo) => {
    if (!window.confirm(`「${addon.name}」を削除しますか？`)) return
    setError(null)
    setDeletingId(addon.txId)
    try {
      await removeTx({ id: addon.txId })
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  if (mode === 'confirm') {
    return (
      <ConfirmForm target={target} anchorDate={anchorDate} onClose={onClose} onBack={() => setMode('detail')} />
    )
  }

  if (mode === 'addon-add') {
    return <AddonForm target={target} addon={null} onDone={() => setMode('detail')} onCancel={() => setMode('detail')} />
  }

  if (editingAddon) {
    return (
      <AddonForm
        target={target}
        addon={editingAddon}
        onDone={() => setEditingAddon(null)}
        onCancel={() => setEditingAddon(null)}
      />
    )
  }

  const totalSign = target.kind === 'expense' ? '-' : '+'
  const totalColor = target.kind === 'expense' ? 'red.7' : 'blue.7'
  const baseAmount = target.baseAmount ?? target.amount

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <Group justify="space-between" align="baseline">
        <Text size="sm" c="dimmed">
          合計
        </Text>
        <Text fz={24} fw={700} c={totalColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {totalSign}
          {formatYen(target.amount)}
        </Text>
      </Group>

      <Stack gap={6}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            ベース（ルール平均）
          </Text>
          <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatYen(baseAmount)}
          </Text>
        </Group>

        {(target.addons ?? []).map((addon) => (
          <Group key={addon.txId} justify="space-between" wrap="nowrap">
            <Text size="sm" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {addon.name}
            </Text>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text
                size="sm"
                c={addon.kind === 'expense' ? 'red.7' : 'blue.7'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {addon.kind === 'expense' ? '-' : '+'}
                {formatYen(addon.amount)}
              </Text>
              <Button variant="subtle" size="xs" onClick={() => setEditingAddon(addon)}>
                編集
              </Button>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                loading={deletingId === addon.txId}
                onClick={() => handleDeleteAddon(addon)}
              >
                削除
              </Button>
            </Group>
          </Group>
        ))}
      </Stack>

      <Button variant="light" onClick={() => setMode('addon-add')}>
        ＋この月に上乗せを追加
      </Button>
      <Button onClick={() => setMode('confirm')}>この月の請求額を確定する</Button>
    </Stack>
  )
}

// 上乗せ（アドオン）の追加・編集フォーム。
function AddonForm({
  target,
  addon,
  onDone,
  onCancel,
}: {
  target: ForecastRow
  addon: AddonInfo | null
  onDone: () => void
  onCancel: () => void
}) {
  const createTx = useMutation(api.transactions.create)
  const updateTx = useMutation(api.transactions.update)

  const [name, setName] = useState(addon?.name ?? '')
  const [amount, setAmount] = useState<number | string>(addon?.amount ?? '')
  const [kind, setKind] = useState<'income' | 'expense'>(addon?.kind ?? 'expense')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      if (addon) {
        // date はこの月の仮想行の日付（＝アドオン作成時に保存した値）をそのまま渡す。
        await updateTx({ id: addon.txId, date: target.date, name, kind, amount: roundedAmount })
      } else {
        await createTx({
          date: target.date,
          name,
          kind,
          amount: roundedAmount,
          ruleId: target.ruleId,
          ruleMonth: target.ruleMonth,
          addon: true,
        })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <TextInput
        label="名前"
        placeholder="例: ピーリング"
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
        <Button variant="subtle" onClick={onCancel} disabled={submitting}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
          保存
        </Button>
      </Group>
    </Stack>
  )
}

// 確定フォーム（従来の「予定を確定」）。金額の初期値は合算後の総額。
function ConfirmForm({
  target,
  anchorDate,
  onClose,
  onBack,
}: {
  target: ForecastRow
  anchorDate: string
  onClose: () => void
  onBack: () => void
}) {
  const createTx = useMutation(api.transactions.create)
  const minDate = addDays(anchorDate, 1)

  const [date, setDate] = useState(target.date)
  const [name, setName] = useState(target.name)
  const [amount, setAmount] = useState<number | string>(target.amount)
  const [kind, setKind] = useState<'income' | 'expense'>(target.kind)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAddons = (target.addons?.length ?? 0) > 0
  const baseAmount = target.baseAmount ?? target.amount
  const addonNet = target.amount - baseAmount
  const referenceText = hasAddons
    ? `ベース ${formatYen(baseAmount)} + 上乗せ ${formatYen(addonNet)}`
    : `ベース ${formatYen(baseAmount)}`

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
      await createTx({
        date,
        name,
        kind,
        amount: roundedAmount,
        ruleId: target.ruleId,
        ruleMonth: target.ruleMonth,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        金額を実際の請求額に直して保存してください。
      </Text>
      <Text size="xs" c="dimmed">
        {referenceText}
      </Text>

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
        <Button variant="subtle" onClick={onBack} disabled={submitting}>
          戻る
        </Button>
        <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
          保存
        </Button>
      </Group>
    </Stack>
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
  const [deletingAddonId, setDeletingAddonId] = useState<string | null>(null)

  const isEdit = target !== null && !target.isVirtual
  const isRuleBacked = isEdit && target?.ruleId !== undefined
  const absorbedAddons = isRuleBacked ? target?.addons ?? [] : []

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

  const handleDeleteAbsorbedAddon = async (addon: AddonInfo) => {
    if (!window.confirm('内訳の記録から削除します。よろしいですか？')) return
    setError(null)
    setDeletingAddonId(addon.txId)
    try {
      await removeTx({ id: addon.txId })
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setDeletingAddonId(null)
    }
  }

  return (
    <Stack gap="md">
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

      {absorbedAddons.length > 0 && (
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            この請求に含まれた上乗せ
          </Text>
          {absorbedAddons.map((addon) => (
            <Group key={addon.txId} justify="space-between" wrap="nowrap">
              <Text
                size="sm"
                c="dimmed"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {addon.name}
              </Text>
              <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                <Text
                  size="sm"
                  c={addon.kind === 'expense' ? 'red.7' : 'blue.7'}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {addon.kind === 'expense' ? '-' : '+'}
                  {formatYen(addon.amount)}
                </Text>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  loading={deletingAddonId === addon.txId}
                  onClick={() => handleDeleteAbsorbedAddon(addon)}
                >
                  削除
                </Button>
              </Group>
            </Group>
          ))}
        </Stack>
      )}

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
