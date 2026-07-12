import { useState } from 'react'
import {
  Button,
  Drawer,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { AddonInfo, ForecastRow } from '../lib/forecast'
import { addDays, formatDateShort, formatMonthLabel } from '../lib/date'
import { formatYen } from '../lib/money'
import { notifyDeleted, notifyError, notifySaved } from '../lib/notify'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const doDeleteAddon = async (addon: AddonInfo) => {
    setDeletingId(addon.txId)
    try {
      await removeTx({ id: addon.txId })
      notifyDeleted()
    } catch (err) {
      notifyError(err, '削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAddon = (addon: AddonInfo) => {
    modals.openConfirmModal({
      title: '削除の確認',
      children: <Text size="sm">「{addon.name}」を削除しますか？</Text>,
      labels: { confirm: '削除', cancel: 'キャンセル' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        void doDeleteAddon(addon)
      },
    })
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
      <Group justify="space-between" align="baseline">
        <Text size="sm" c="dimmed">
          合計
        </Text>
        <Text fz={24} fw={700} c={totalColor}>
          {totalSign}
          {formatYen(target.amount)}
        </Text>
      </Group>

      <Stack gap={6}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            ベース（ルール平均）
          </Text>
          <Text size="sm">{formatYen(baseAmount)}</Text>
        </Group>

        {(target.addons ?? []).map((addon) => (
          <Group key={addon.txId} justify="space-between" wrap="nowrap">
            <Text size="sm" c="dimmed" truncate style={{ minWidth: 0 }}>
              {addon.name}
            </Text>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="sm" c={addon.kind === 'expense' ? 'red.7' : 'blue.7'}>
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

type AddonFormValues = {
  name: string
  amount: number | string
  kind: 'income' | 'expense'
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
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<AddonFormValues>({
    initialValues: {
      name: addon?.name ?? '',
      amount: addon?.amount ?? '',
      kind: addon?.kind ?? 'expense',
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? '名前を入力してください' : null),
      amount: (value) => (typeof value !== 'number' ? '金額を入力してください' : null),
    },
  })

  const handleSubmit = async (values: AddonFormValues) => {
    if (typeof values.amount !== 'number') return
    setSubmitting(true)
    try {
      const roundedAmount = Math.round(values.amount)
      if (addon) {
        // date はこの月の仮想行の日付（＝アドオン作成時に保存した値）をそのまま渡す。
        await updateTx({ id: addon.txId, date: target.date, name: values.name, kind: values.kind, amount: roundedAmount })
      } else {
        await createTx({
          date: target.date,
          name: values.name,
          kind: values.kind,
          amount: roundedAmount,
          ruleId: target.ruleId,
          ruleMonth: target.ruleMonth,
          addon: true,
        })
      }
      notifySaved()
      onDone()
    } catch (err) {
      notifyError(err, '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="名前"
          placeholder="例: ピーリング"
          disabled={submitting}
          {...form.getInputProps('name')}
        />

        <NumberInput
          label="金額"
          placeholder="0"
          thousandSeparator=","
          hideControls
          min={0}
          max={1_000_000_000}
          prefix="¥"
          inputMode="numeric"
          disabled={submitting}
          {...form.getInputProps('amount')}
        />

        <SegmentedControl
          value={form.values.kind}
          onChange={(value) => form.setFieldValue('kind', value as 'income' | 'expense')}
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
          <Button type="submit" loading={submitting} disabled={submitting}>
            保存
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

type ConfirmFormValues = {
  date: string
  name: string
  amount: number | string
  kind: 'income' | 'expense'
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
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ConfirmFormValues>({
    initialValues: {
      date: target.date,
      name: target.name,
      amount: target.amount,
      kind: target.kind,
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? '名前を入力してください' : null),
      amount: (value) => (typeof value !== 'number' ? '金額を入力してください' : null),
    },
  })

  const hasAddons = (target.addons?.length ?? 0) > 0
  const baseAmount = target.baseAmount ?? target.amount
  const addonNet = target.amount - baseAmount
  const referenceText = hasAddons
    ? `ベース ${formatYen(baseAmount)} + 上乗せ ${formatYen(addonNet)}`
    : `ベース ${formatYen(baseAmount)}`

  const handleSubmit = async (values: ConfirmFormValues) => {
    if (typeof values.amount !== 'number') return
    setSubmitting(true)
    try {
      const roundedAmount = Math.round(values.amount)
      await createTx({
        date: values.date,
        name: values.name,
        kind: values.kind,
        amount: roundedAmount,
        ruleId: target.ruleId,
        ruleMonth: target.ruleMonth,
      })
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          金額を実際の請求額に直して保存してください。
        </Text>
        <Text size="xs" c="dimmed">
          {referenceText}
        </Text>

        <TextInput
          type="date"
          label="日付"
          min={minDate}
          disabled={submitting}
          {...form.getInputProps('date')}
        />

        <TextInput
          label="名前"
          placeholder="例: 家賃"
          disabled={submitting}
          {...form.getInputProps('name')}
        />

        <NumberInput
          label="金額"
          placeholder="0"
          thousandSeparator=","
          hideControls
          min={0}
          max={1_000_000_000}
          prefix="¥"
          inputMode="numeric"
          disabled={submitting}
          {...form.getInputProps('amount')}
        />

        <SegmentedControl
          value={form.values.kind}
          onChange={(value) => form.setFieldValue('kind', value as 'income' | 'expense')}
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
          <Button type="submit" loading={submitting} disabled={submitting}>
            保存
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

type TransactionFormValues = {
  date: string
  name: string
  amount: number | string
  kind: 'income' | 'expense'
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

  const [submitting, setSubmitting] = useState(false)
  const [deletingAddonId, setDeletingAddonId] = useState<string | null>(null)

  const form = useForm<TransactionFormValues>({
    initialValues: {
      date: initialDate,
      name: target?.name ?? '',
      amount: target?.amount ?? '',
      kind: target?.kind ?? 'expense',
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? '名前を入力してください' : null),
      amount: (value) => (typeof value !== 'number' ? '金額を入力してください' : null),
    },
  })

  const isEdit = target !== null && !target.isVirtual
  const isRuleBacked = isEdit && target?.ruleId !== undefined
  const absorbedAddons = isRuleBacked ? target?.addons ?? [] : []

  const handleSubmit = async (values: TransactionFormValues) => {
    if (typeof values.amount !== 'number') return
    setSubmitting(true)
    try {
      const roundedAmount = Math.round(values.amount)
      if (isEdit && target?.txId) {
        await updateTx({ id: target.txId, date: values.date, name: values.name, kind: values.kind, amount: roundedAmount })
      } else {
        await createTx({ date: values.date, name: values.name, kind: values.kind, amount: roundedAmount })
      }
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const doDelete = async () => {
    if (!target?.txId) return
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

  const handleDelete = () => {
    if (!target?.txId) return
    if (isRuleBacked) {
      modals.openConfirmModal({
        title: '予定に戻す',
        children: <Text size="sm">この確定を取り消して予定に戻しますか？</Text>,
        labels: { confirm: '予定に戻す', cancel: 'キャンセル' },
        confirmProps: { color: 'red' },
        onConfirm: () => {
          void doDelete()
        },
      })
    } else {
      modals.openConfirmModal({
        title: '削除の確認',
        children: <Text size="sm">この取引を削除しますか？</Text>,
        labels: { confirm: '削除', cancel: 'キャンセル' },
        confirmProps: { color: 'red' },
        onConfirm: () => {
          void doDelete()
        },
      })
    }
  }

  const doDeleteAbsorbedAddon = async (addon: AddonInfo) => {
    setDeletingAddonId(addon.txId)
    try {
      await removeTx({ id: addon.txId })
      notifyDeleted()
    } catch (err) {
      notifyError(err, '削除に失敗しました')
    } finally {
      setDeletingAddonId(null)
    }
  }

  const handleDeleteAbsorbedAddon = (addon: AddonInfo) => {
    modals.openConfirmModal({
      title: '削除の確認',
      children: <Text size="sm">内訳の記録から削除します。よろしいですか？</Text>,
      labels: { confirm: '削除', cancel: 'キャンセル' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        void doDeleteAbsorbedAddon(addon)
      },
    })
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          type="date"
          label="日付"
          min={minDate}
          disabled={submitting}
          {...form.getInputProps('date')}
        />

        <TextInput
          label="名前"
          placeholder="例: 家賃"
          disabled={submitting}
          {...form.getInputProps('name')}
        />

        <NumberInput
          label="金額"
          placeholder="0"
          thousandSeparator=","
          hideControls
          min={0}
          max={1_000_000_000}
          prefix="¥"
          inputMode="numeric"
          disabled={submitting}
          {...form.getInputProps('amount')}
        />

        <SegmentedControl
          value={form.values.kind}
          onChange={(value) => form.setFieldValue('kind', value as 'income' | 'expense')}
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
                <Text size="sm" c="dimmed" truncate style={{ minWidth: 0 }}>
                  {addon.name}
                </Text>
                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                  <Text size="sm" c={addon.kind === 'expense' ? 'red.7' : 'blue.7'}>
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
          <Button type="submit" loading={submitting} disabled={submitting}>
            保存
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
