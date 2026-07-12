import { useState, type FormEvent } from 'react'
import {
  Button,
  Drawer,
  FieldError,
  Input,
  Label,
  NumberField,
  Spinner,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { AddonInfo, ForecastRow } from '../lib/forecast'
import { addDays, formatDateShort, formatMonthLabel } from '../lib/date'
import { formatYen } from '../lib/money'
import { notifyDeleted, notifyError, notifySaved } from '../lib/notify'
import { UpgradeButton, usePlan } from './BillingControls'
import { useConfirm } from './ConfirmDialog'

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
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>{titleFor(target)}</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
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
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
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
  const { plan } = usePlan()
  const confirm = useConfirm()
  const canAddAddon = plan === 'pro'

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

  const handleDeleteAddon = async (addon: AddonInfo) => {
    const ok = await confirm({
      title: '削除の確認',
      description: `「${addon.name}」を削除しますか？`,
      confirmLabel: '削除',
      isDestructive: true,
    })
    if (!ok) return
    await doDeleteAddon(addon)
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
  const totalColor = target.kind === 'expense' ? 'text-red-600' : 'text-blue-600'
  const baseAmount = target.baseAmount ?? target.amount

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">合計</span>
        <span className={`text-2xl font-bold tabular-nums ${totalColor}`}>
          {totalSign}
          {formatYen(target.amount)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="text-sm text-muted">ベース（ルール平均）</span>
          <span className="text-sm tabular-nums">{formatYen(baseAmount)}</span>
        </div>

        {(target.addons ?? []).map((addon) => (
          <div key={addon.txId} className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm text-muted">{addon.name}</span>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`text-sm tabular-nums ${addon.kind === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                {addon.kind === 'expense' ? '-' : '+'}
                {formatYen(addon.amount)}
              </span>
              <Button variant="tertiary" size="sm" onPress={() => setEditingAddon(addon)}>
                編集
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                isPending={deletingId === addon.txId}
                onPress={() => handleDeleteAddon(addon)}
              >
                削除
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="secondary" onPress={() => setMode('addon-add')} isDisabled={!canAddAddon}>
        ＋この月に上乗せを追加
      </Button>
      {!canAddAddon && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted">上乗せの追加はProプラン限定です</p>
          <UpgradeButton size="sm" />
        </div>
      )}
      <Button onPress={() => setMode('confirm')}>この月の請求額を確定する</Button>
    </div>
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
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState(addon?.name ?? '')
  const [amount, setAmount] = useState<number | undefined>(addon?.amount)
  const [kind, setKind] = useState<'income' | 'expense'>(addon?.kind ?? 'expense')
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (name.trim().length === 0) nextErrors.name = '名前を入力してください'
    if (amount === undefined) nextErrors.amount = '金額を入力してください'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || amount === undefined) return

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
      notifySaved()
      onDone()
    } catch (err) {
      notifyError(err, '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField isInvalid={!!errors.name} isDisabled={submitting}>
        <Label>名前</Label>
        <Input placeholder="例: ピーリング" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </TextField>

      <NumberField
        isInvalid={!!errors.amount}
        isDisabled={submitting}
        minValue={0}
        maxValue={1_000_000_000}
        value={amount}
        onChange={setAmount}
        formatOptions={{ style: 'currency', currency: 'JPY' }}
      >
        <Label>金額</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="flex-1" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {errors.amount && <FieldError>{errors.amount}</FieldError>}
      </NumberField>

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
        <Button variant="tertiary" onPress={onCancel} isDisabled={submitting}>
          キャンセル
        </Button>
        <Button type="submit" isPending={submitting} isDisabled={submitting}>
          {submitting && <Spinner color="current" size="sm" />}
          保存
        </Button>
      </div>
    </form>
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
  const [submitting, setSubmitting] = useState(false)

  const [date, setDate] = useState(target.date)
  const [name, setName] = useState(target.name)
  const [amount, setAmount] = useState<number | undefined>(target.amount)
  const [kind, setKind] = useState<'income' | 'expense'>(target.kind)
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({})

  const hasAddons = (target.addons?.length ?? 0) > 0
  const baseAmount = target.baseAmount ?? target.amount
  const addonNet = target.amount - baseAmount
  const referenceText = hasAddons
    ? `ベース ${formatYen(baseAmount)} + 上乗せ ${formatYen(addonNet)}`
    : `ベース ${formatYen(baseAmount)}`

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (name.trim().length === 0) nextErrors.name = '名前を入力してください'
    if (amount === undefined) nextErrors.amount = '金額を入力してください'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || amount === undefined) return

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
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">金額を実際の請求額に直して保存してください。</p>
      <p className="text-xs text-muted">{referenceText}</p>

      <label className="flex flex-col gap-1.5 text-sm">
        日付
        <input
          type="date"
          min={minDate}
          disabled={submitting}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>

      <TextField isInvalid={!!errors.name} isDisabled={submitting}>
        <Label>名前</Label>
        <Input placeholder="例: 家賃" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </TextField>

      <NumberField
        isInvalid={!!errors.amount}
        isDisabled={submitting}
        minValue={0}
        maxValue={1_000_000_000}
        value={amount}
        onChange={setAmount}
        formatOptions={{ style: 'currency', currency: 'JPY' }}
      >
        <Label>金額</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="flex-1" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {errors.amount && <FieldError>{errors.amount}</FieldError>}
      </NumberField>

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
        <Button variant="tertiary" onPress={onBack} isDisabled={submitting}>
          戻る
        </Button>
        <Button type="submit" isPending={submitting} isDisabled={submitting}>
          {submitting && <Spinner color="current" size="sm" />}
          保存
        </Button>
      </div>
    </form>
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
  const confirm = useConfirm()

  const minDate = addDays(anchorDate, 1)
  const initialDate = target?.date ?? (today > minDate ? today : minDate)

  const [submitting, setSubmitting] = useState(false)
  const [deletingAddonId, setDeletingAddonId] = useState<string | null>(null)

  const [date, setDate] = useState(initialDate)
  const [name, setName] = useState(target?.name ?? '')
  const [amount, setAmount] = useState<number | undefined>(target?.amount)
  const [kind, setKind] = useState<'income' | 'expense'>(target?.kind ?? 'expense')
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({})

  const isEdit = target !== null && !target.isVirtual
  const isRuleBacked = isEdit && target?.ruleId !== undefined
  const absorbedAddons = isRuleBacked ? target?.addons ?? [] : []

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (name.trim().length === 0) nextErrors.name = '名前を入力してください'
    if (amount === undefined) nextErrors.amount = '金額を入力してください'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || amount === undefined) return

    setSubmitting(true)
    try {
      const roundedAmount = Math.round(amount)
      if (isEdit && target?.txId) {
        await updateTx({ id: target.txId, date, name, kind, amount: roundedAmount })
      } else {
        await createTx({ date, name, kind, amount: roundedAmount })
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

  const handleDelete = async () => {
    if (!target?.txId) return
    if (isRuleBacked) {
      const ok = await confirm({
        title: '予定に戻す',
        description: 'この確定を取り消して予定に戻しますか？',
        confirmLabel: '予定に戻す',
        isDestructive: true,
      })
      if (!ok) return
      await doDelete()
    } else {
      const ok = await confirm({
        title: '削除の確認',
        description: 'この取引を削除しますか？',
        confirmLabel: '削除',
        isDestructive: true,
      })
      if (!ok) return
      await doDelete()
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

  const handleDeleteAbsorbedAddon = async (addon: AddonInfo) => {
    const ok = await confirm({
      title: '削除の確認',
      description: '内訳の記録から削除します。よろしいですか？',
      confirmLabel: '削除',
      isDestructive: true,
    })
    if (!ok) return
    await doDeleteAbsorbedAddon(addon)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        日付
        <input
          type="date"
          min={minDate}
          disabled={submitting}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>

      <TextField isInvalid={!!errors.name} isDisabled={submitting}>
        <Label>名前</Label>
        <Input placeholder="例: 家賃" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </TextField>

      <NumberField
        isInvalid={!!errors.amount}
        isDisabled={submitting}
        minValue={0}
        maxValue={1_000_000_000}
        value={amount}
        onChange={setAmount}
        formatOptions={{ style: 'currency', currency: 'JPY' }}
      >
        <Label>金額</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="flex-1" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {errors.amount && <FieldError>{errors.amount}</FieldError>}
      </NumberField>

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

      {absorbedAddons.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">この請求に含まれた上乗せ</span>
          {absorbedAddons.map((addon) => (
            <div key={addon.txId} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm text-muted">{addon.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`text-sm tabular-nums ${addon.kind === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                  {addon.kind === 'expense' ? '-' : '+'}
                  {formatYen(addon.amount)}
                </span>
                <Button
                  variant="tertiary"
                  size="sm"
                  isPending={deletingAddonId === addon.txId}
                  onPress={() => handleDeleteAbsorbedAddon(addon)}
                >
                  削除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex justify-between">
        {isEdit ? (
          <Button variant="danger-soft" onPress={handleDelete} isDisabled={submitting}>
            {isRuleBacked ? '予定に戻す' : '削除'}
          </Button>
        ) : (
          <div />
        )}
        <Button type="submit" isPending={submitting} isDisabled={submitting}>
          {submitting && <Spinner color="current" size="sm" />}
          保存
        </Button>
      </div>
    </form>
  )
}
