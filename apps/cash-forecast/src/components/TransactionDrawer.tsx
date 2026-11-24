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
import type { AddonInfo, ForecastRow } from '../lib/forecast'
import { addDays, formatDateShort, formatMonthLabel } from '../lib/date'
import { formatYen, type Kind } from '../lib/money'
import { KindYen, kindTone } from './Amount'
import { notifyDeleted, notifyError, notifySaved } from '../lib/notify'
import { UpgradeButton, usePlan } from './BillingControls'
import { useConfirm } from './ConfirmDialog'
import {
  initAmountLinesFromTx,
  sumAmountLines,
  toAmountBreakdown,
  type AmountLine,
} from '../lib/amountLines'
import { AmountLinesField } from './AmountLinesField'
import { MoneyField } from './MoneyField'
import { ReparentTargetPicker, type ReparentCandidate } from './ReparentTargetPicker'
import { filterReparentMoveCandidates, type ReparentRuleMonthTarget } from '../lib/reparentCandidates'
import type { Id } from '../../convex/_generated/dataModel'

type TransactionDrawerProps = {
  opened: boolean
  onClose: () => void
  anchorDate: string
  today: string
  target: ForecastRow | null
  /** 同じ kind・予定側の移動先候補（仮想・addon・import 除外済み） */
  reparentCandidates?: ReparentCandidate[]
}

function titleFor(target: ForecastRow | null): string {
  if (!target) return '取引を追加'
  if (target.isVirtual) {
    const month = target.ruleMonth ? formatMonthLabel(target.ruleMonth) : ''
    return `${target.name}${target.periodLabel ?? ''}（${month}・${formatDateShort(target.date)}）`
  }
  return '取引を編集'
}

export function TransactionDrawer({
  opened,
  onClose,
  anchorDate,
  today,
  target,
  reparentCandidates = [],
}: TransactionDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>{titleFor(target)}</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body className="flex min-h-0 flex-col">
            {opened &&
              (target?.isVirtual ? (
                <RuleMonthDetail
                  key={target.key}
                  target={target}
                  anchorDate={anchorDate}
                  today={today}
                  onClose={onClose}
                  reparentCandidates={reparentCandidates}
                />
              ) : (
                <TransactionForm
                  key={target?.key ?? 'new'}
                  anchorDate={anchorDate}
                  today={today}
                  target={target}
                  onClose={onClose}
                  reparentCandidates={reparentCandidates}
                />
              ))}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

export function AddonLineDetail({
  addon,
  canReparent,
  isPending,
  onBack,
  onEdit,
  onDelete,
  onUndo,
  onMove,
}: {
  addon: AddonInfo
  canReparent: boolean
  isPending: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onUndo: () => void
  onMove: () => void
}) {
  const canUndo = addon.reparentOrigin !== undefined

  return (
    <div className="flex flex-col gap-4" data-testid="addon-line-detail">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-muted">上乗せ</p>
          <p className="truncate text-base font-medium">{addon.name}</p>
        </div>
        <span className={`text-lg font-bold tabular-nums ${kindTone(addon.kind)}`}>
          <KindYen kind={addon.kind} amount={addon.amount} />
        </span>
      </div>

      {canUndo ? (
        <Button variant="secondary" isPending={isPending} onPress={onUndo}>
          元の取引に戻す
        </Button>
      ) : (
        <p className="text-sm text-muted" data-testid="addon-no-reparent-origin">
          手動で追加した上乗せは、元の取引へ戻せません（内訳から移動した上乗せのみ対象）。
        </p>
      )}
      {canReparent ? (
        <Button variant="secondary" isDisabled={isPending} onPress={onMove}>
          別の場所へ移動
        </Button>
      ) : (
        <p className="text-sm text-muted">上乗せの移動はProプラン限定です</p>
      )}

      <Button variant="tertiary" onPress={onEdit} isDisabled={isPending}>
        名前・金額を編集
      </Button>

      <Button variant="tertiary" onPress={onBack} isDisabled={isPending}>
        戻る
      </Button>

      <Button
        variant="tertiary"
        className="text-danger"
        onPress={onDelete}
        isDisabled={isPending}
        data-testid="addon-delete"
      >
        削除
      </Button>
    </div>
  )
}

// ルール月の詳細ビュー（仮想行クリック時）。
// 「合算内訳の閲覧 / 上乗せの追加・編集・削除 / この月の請求額を確定」をこの中で完結させる。
function RuleMonthDetail({
  target,
  anchorDate,
  today: _today,
  onClose,
  reparentCandidates,
}: {
  target: ForecastRow
  anchorDate: string
  today: string
  onClose: () => void
  reparentCandidates: ReparentCandidate[]
}) {
  const [mode, setMode] = useState<'detail' | 'confirm' | 'addon-add'>('detail')
  const [editingAddon, setEditingAddon] = useState<AddonInfo | null>(null)
  const [detailAddon, setDetailAddon] = useState<AddonInfo | null>(null)
  const [movingAddon, setMovingAddon] = useState<AddonInfo | null>(null)
  const [addonSubmitting, setAddonSubmitting] = useState(false)
  const removeTx = useMutation(api.transactions.remove)
  const undoReparentToRuleAddon = useMutation(api.transactions.undoReparentBreakdownLineToRuleAddon)
  const reparentAddonToRuleMonth = useMutation(api.transactions.reparentAddonToRuleMonth)
  const reparentAddonToTransaction = useMutation(api.transactions.reparentAddonToTransaction)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { plan } = usePlan()
  const confirm = useConfirm()
  const canReparent = plan === 'pro'
  const canAddAddon = plan === 'pro'

  const addonKindCandidates = filterReparentMoveCandidates(reparentCandidates, {
    kind: target.kind,
    sourceAddonRuleMonth:
      target.ruleId !== undefined && target.ruleMonth !== undefined
        ? { ruleId: target.ruleId, ruleMonth: target.ruleMonth }
        : undefined,
  })

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

  const handleUndoAddonReparent = async (addon: AddonInfo) => {
    if (addon.reparentOrigin === undefined) return
    setAddonSubmitting(true)
    try {
      await undoReparentToRuleAddon({
        sourceId: addon.reparentOrigin.sourceId,
        addonId: addon.txId,
        sourceIndex: addon.reparentOrigin.sourceIndex,
        expectedAmount: addon.amount,
        expectedLabel: addon.rawName !== '' ? addon.rawName : undefined,
      })
      notifySaved('元の取引に戻しました')
      onClose()
    } catch (err) {
      notifyError(err, '元の取引に戻せませんでした')
      setAddonSubmitting(false)
    }
  }

  const handleReparentAddonToTx = async (addon: AddonInfo, targetId: Id<'transactions'>) => {
    setAddonSubmitting(true)
    try {
      const result = await reparentAddonToTransaction({
        addonId: addon.txId,
        targetId,
        expectedAmount: addon.amount,
        expectedLabel: addon.rawName !== '' ? addon.rawName : undefined,
      })
      notifySaved(`${addon.name}を移動しました`)
      if (result.dateChanged) {
        // 日付差はトースト本文に載せず保存のみ（誤タップ防止）
      }
      onClose()
    } catch (err) {
      notifyError(err, '移動に失敗しました')
      setAddonSubmitting(false)
    }
  }

  const handleReparentAddonRuleMonth = async (addon: AddonInfo, ruleTarget: ReparentRuleMonthTarget) => {
    if (target.ruleId === undefined) return
    setAddonSubmitting(true)
    try {
      await reparentAddonToRuleMonth({
        addonId: addon.txId,
        ruleId: ruleTarget.ruleId,
        ruleMonth: ruleTarget.ruleMonth,
        expectedRuleDate: ruleTarget.date,
        expectedAmount: addon.amount,
        expectedLabel: addon.rawName !== '' ? addon.rawName : undefined,
      })
      notifySaved(`${addon.name}を移動しました`)
      onClose()
    } catch (err) {
      notifyError(err, '移動に失敗しました')
      setAddonSubmitting(false)
    }
  }

  if (movingAddon !== null && canReparent) {
    return (
      <ReparentTargetPicker
        candidates={addonKindCandidates}
        sourceDate={target.date}
        lineLabel={movingAddon.name}
        lineAmount={movingAddon.amount}
        kind={target.kind}
        isPending={addonSubmitting}
        showRecurringSections
        onSelect={(id) => {
          void handleReparentAddonToTx(movingAddon, id)
        }}
        onSelectRuleMonth={(ruleTarget) => {
          void handleReparentAddonRuleMonth(movingAddon, ruleTarget)
        }}
        onCancel={() => setMovingAddon(null)}
      />
    )
  }

  if (detailAddon) {
    return (
      <AddonLineDetail
        addon={detailAddon}
        canReparent={canReparent}
        isPending={addonSubmitting}
        onBack={() => setDetailAddon(null)}
        onEdit={() => {
          setEditingAddon(detailAddon)
          setDetailAddon(null)
        }}
        onDelete={() => handleDeleteAddon(detailAddon)}
        onUndo={() => {
          void handleUndoAddonReparent(detailAddon)
        }}
        onMove={() => setMovingAddon(detailAddon)}
      />
    )
  }

  const baseAmount = target.baseAmount ?? target.amount

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">合計</span>
        <span className={`text-2xl font-bold tabular-nums ${kindTone(target.kind)}`}>
          <KindYen kind={target.kind} amount={target.amount} />
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="text-sm text-muted">ベース（ルール平均）</span>
          <span className={`text-sm tabular-nums ${kindTone(target.kind)}`}>
            <KindYen kind={target.kind} amount={baseAmount} />
          </span>
        </div>

        {(target.addons ?? []).map((addon) => (
          <button
            key={addon.txId}
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-surface-secondary"
            data-testid="addon-line-open"
            onClick={() => setDetailAddon(addon)}
          >
            <span className="min-w-0 truncate text-sm text-muted">{addon.name}</span>
            <span className={`shrink-0 text-sm tabular-nums ${kindTone(addon.kind)}`}>
              <KindYen kind={addon.kind} amount={addon.amount} />
            </span>
          </button>
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

  const [name, setName] = useState(addon?.rawName ?? '')
  const [amount, setAmount] = useState<number | undefined>(addon?.amount)
  const [kind, setKind] = useState<Kind>(addon?.kind ?? 'expense')
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({})

  const handleAmountChange = (v: number | undefined) => {
    setAmount(v)
    if (v !== undefined) setErrors((prev) => (prev.amount ? { ...prev, amount: undefined } : prev))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
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
        <Label>名前（任意）</Label>
        <Input placeholder="例: ピーリング（空欄可）" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </TextField>

      <MoneyField label="金額" value={amount} onChange={handleAmountChange} error={errors.amount} isDisabled={submitting} />

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
  const [kind, setKind] = useState<Kind>(target.kind)
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({})

  const hasAddons = (target.addons?.length ?? 0) > 0
  const baseAmount = target.baseAmount ?? target.amount
  const addonNet = target.amount - baseAmount
  const referenceText = hasAddons
    ? `ベース ${formatYen(baseAmount)} + 上乗せ ${formatYen(addonNet)}`
    : `ベース ${formatYen(baseAmount)}`

  const handleNameChange = (v: string) => {
    setName(v)
    if (v.trim().length > 0) setErrors((prev) => (prev.name ? { ...prev, name: undefined } : prev))
  }

  const handleAmountChange = (v: number | undefined) => {
    setAmount(v)
    if (v !== undefined) setErrors((prev) => (prev.amount ? { ...prev, amount: undefined } : prev))
  }

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
        <Input placeholder="例: 家賃" value={name} onChange={(e) => handleNameChange(e.target.value)} />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </TextField>

      <MoneyField label="金額" value={amount} onChange={handleAmountChange} error={errors.amount} isDisabled={submitting} />

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
  reparentCandidates,
}: {
  anchorDate: string
  today: string
  target: ForecastRow | null
  onClose: () => void
  reparentCandidates: ReparentCandidate[]
}) {
  const createTx = useMutation(api.transactions.create)
  const updateTx = useMutation(api.transactions.update)
  const removeTx = useMutation(api.transactions.remove)
  const reparentLine = useMutation(api.transactions.reparentBreakdownLine)
  const reparentToRuleAddon = useMutation(api.transactions.reparentBreakdownLineToRuleAddon)
  const confirm = useConfirm()

  const minDate = addDays(anchorDate, 1)
  const initialDate = target?.date ?? (today > minDate ? today : minDate)

  const [submitting, setSubmitting] = useState(false)
  const [deletingAddonId, setDeletingAddonId] = useState<string | null>(null)
  const [movingLine, setMovingLine] = useState<AmountLine | null>(null)

  const [date, setDate] = useState(initialDate)
  const [name, setName] = useState(target?.rawName ?? target?.name ?? '')
  const [lines, setLines] = useState<AmountLine[]>(() =>
    initAmountLinesFromTx({ amount: target?.amount, amountBreakdown: target?.amountBreakdown }),
  )
  const [kind, setKind] = useState<Kind>(target?.kind ?? 'expense')
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({})

  const isEdit = target !== null && !target.isVirtual
  const isRuleBacked = isEdit && target?.ruleId !== undefined
  const absorbedAddons = isRuleBacked ? target?.addons ?? [] : []

  const { plan } = usePlan()
  const kindCandidates = filterReparentMoveCandidates(reparentCandidates, {
    kind,
    sourceTxId: target?.txId,
  })

  const handleReparent = async (targetId: Id<'transactions'>) => {
    if (!target?.txId || movingLine?.serverIndex === undefined) return
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
      notifySaved(`${label}を移動しました`)
      onClose()
    } catch (err) {
      notifyError(err, '移動に失敗しました')
      setSubmitting(false)
    }
  }

  const handleReparentRuleMonth = async (ruleTarget: ReparentRuleMonthTarget) => {
    if (!target?.txId || movingLine?.serverIndex === undefined) return
    const breakdown = target.amountBreakdown
    if (breakdown === undefined || breakdown.length < 2) return
    const serverEntry = breakdown[movingLine.serverIndex]
    if (serverEntry === undefined) {
      notifyError(new Error('内訳の行が見つかりません'), '移動に失敗しました')
      return
    }

    setSubmitting(true)
    try {
      const result = await reparentToRuleAddon({
        sourceId: target.txId,
        ruleId: ruleTarget.ruleId,
        ruleMonth: ruleTarget.ruleMonth,
        expectedRuleDate: ruleTarget.date,
        index: movingLine.serverIndex,
        expectedAmount: serverEntry.amount,
        expectedLabel: serverEntry.label,
      })
      const label =
        movingLine.label !== '' ? movingLine.label : `項目${movingLine.serverIndex + 1}`
      notifySaved(`${label}を定期へ移動しました`)
      onClose()
    } catch (err) {
      notifyError(err, '移動に失敗しました')
      setSubmitting(false)
    }
  }

  if (movingLine !== null && isEdit) {
    return (
      <ReparentTargetPicker
        candidates={kindCandidates}
        sourceDate={target?.date ?? date}
        lineLabel={movingLine.label !== '' ? movingLine.label : `項目${(movingLine.serverIndex ?? 0) + 1}`}
        lineAmount={movingLine.value ?? 0}
        kind={kind}
        isPending={submitting}
        showRecurringSections={plan === 'pro'}
        onSelect={(id) => {
          void handleReparent(id)
        }}
        onSelectRuleMonth={(ruleTarget) => {
          void handleReparentRuleMonth(ruleTarget)
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
    if (name.trim().length === 0) nextErrors.name = '名前を入力してください'
    if (total === undefined) nextErrors.amount = '金額を入力してください'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || total === undefined) return

    setSubmitting(true)
    try {
      const roundedAmount = Math.round(total)
      // update では undefined 省略が「触らない」なので、内訳なしは [] で明示クリアする
      const amountBreakdown = toAmountBreakdown(lines) ?? []
      if (isEdit && target?.txId) {
        await updateTx({
          id: target.txId,
          date,
          name,
          kind,
          amount: roundedAmount,
          amountBreakdown,
        })
      } else {
        await createTx({
          date,
          name,
          kind,
          amount: roundedAmount,
          amountBreakdown: amountBreakdown.length > 0 ? amountBreakdown : undefined,
        })
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
        <Input placeholder="例: 家賃" value={name} onChange={(e) => handleNameChange(e.target.value)} />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </TextField>

      <AmountLinesField
        lines={lines}
        onChange={handleLinesChange}
        kind={kind}
        error={errors.amount}
        isDisabled={submitting}
        onMoveLine={isEdit ? (line) => setMovingLine(line) : undefined}
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

      {absorbedAddons.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">この請求に含まれた上乗せ</span>
          {absorbedAddons.map((addon) => (
            <div key={addon.txId} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm text-muted">{addon.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`text-sm tabular-nums ${kindTone(addon.kind)}`}><KindYen kind={addon.kind} amount={addon.amount} /></span>
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
