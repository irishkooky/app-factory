import { useState, type FormEvent } from 'react'
import {
  Button,
  Card,
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
import type { Doc } from '../../convex/_generated/dataModel'
import { formatYen } from '../lib/money'
import { notifyDeleted, notifyError, notifySaved } from '../lib/notify'
import { UpgradeButton, usePlan } from './BillingControls'
import { useConfirm } from './ConfirmDialog'

// convex/rules.ts の FREE_RULE_LIMIT と同じ値。UI表示用の写しであり、
// 実際の上限判定は常にサーバー側（rules.create）で行われる。
const FREE_RULE_LIMIT = 3

type RulesDrawerProps = {
  opened: boolean
  onClose: () => void
  rules: Doc<'rules'>[] | undefined
}

export function RulesDrawer({ opened, onClose, rules }: RulesDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>ルール管理</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>{opened && <RulesDrawerContent rules={rules} />}</Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function RulesDrawerContent({ rules }: { rules: Doc<'rules'>[] | undefined }) {
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editingRule, setEditingRule] = useState<Doc<'rules'> | null>(null)
  const removeRule = useMutation(api.rules.remove)
  const { plan } = usePlan()
  const confirm = useConfirm()
  const atFreeLimit = plan === 'free' && (rules?.length ?? 0) >= FREE_RULE_LIMIT

  const handleAdd = () => {
    setEditingRule(null)
    setMode('form')
  }

  const handleEdit = (rule: Doc<'rules'>) => {
    setEditingRule(rule)
    setMode('form')
  }

  const doDelete = async (rule: Doc<'rules'>) => {
    try {
      await removeRule({ id: rule._id })
      notifyDeleted()
    } catch (err) {
      notifyError(err, '削除に失敗しました')
    }
  }

  const handleDelete = async (rule: Doc<'rules'>) => {
    const ok = await confirm({
      title: '削除の確認',
      description: `「${rule.name}」を削除しますか？確定済みの過去分は残ります。`,
      confirmLabel: '削除',
      isDestructive: true,
    })
    if (!ok) return
    await doDelete(rule)
  }

  if (mode === 'form') {
    return (
      <RuleForm
        rule={editingRule}
        onDone={() => setMode('list')}
        onCancel={() => setMode('list')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {rules === undefined ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-center text-muted">
            給与や毎月の引き落としをルールにすると、未来の残高が自動で予測されます。
          </p>
          <Button onPress={handleAdd}>＋ルールを追加</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {rules.map((rule) => (
              <Card key={rule._id}>
                <Card.Content className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{rule.name}</span>
                    <span className={`text-sm ${rule.kind === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                      {rule.kind === 'expense' ? '-' : '+'}
                      {formatYen(rule.amount)}
                    </span>
                    <span className="text-xs text-muted">
                      毎月{rule.dayOfMonth}日
                      {rule.endDate ? `（${rule.endDate}まで）` : ''}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="tertiary" size="sm" onPress={() => handleEdit(rule)}>
                      編集
                    </Button>
                    <Button variant="tertiary" size="sm" onPress={() => handleDelete(rule)}>
                      削除
                    </Button>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
          <Button onPress={handleAdd} isDisabled={atFreeLimit}>
            ＋ルールを追加
          </Button>
          {atFreeLimit && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-muted">
                Freeプランはルール{FREE_RULE_LIMIT}件まで。Proプランなら無制限です
              </p>
              <UpgradeButton size="sm" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RuleForm({
  rule,
  onDone,
  onCancel,
}: {
  rule: Doc<'rules'> | null
  onDone: () => void
  onCancel: () => void
}) {
  const createRule = useMutation(api.rules.create)
  const updateRule = useMutation(api.rules.update)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState(rule?.name ?? '')
  const [kind, setKind] = useState<'income' | 'expense'>(rule?.kind ?? 'expense')
  const [amount, setAmount] = useState<number | undefined>(rule?.amount)
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(rule?.dayOfMonth ?? 1)
  const [endDate, setEndDate] = useState(rule?.endDate ?? '')

  const [errors, setErrors] = useState<{ name?: string; amount?: string; dayOfMonth?: string }>({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (name.trim().length === 0) nextErrors.name = '名前を入力してください'
    if (amount === undefined) nextErrors.amount = '金額を入力してください'
    if (dayOfMonth === undefined || dayOfMonth < 1 || dayOfMonth > 31) {
      nextErrors.dayOfMonth = '日は1から31の間で入力してください'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || amount === undefined || dayOfMonth === undefined) return

    setSubmitting(true)
    try {
      const args = {
        name,
        kind,
        amount: Math.round(amount),
        dayOfMonth: Math.round(dayOfMonth),
        endDate: endDate.length > 0 ? endDate : undefined,
      }
      if (rule) {
        await updateRule({ id: rule._id, ...args })
      } else {
        await createRule(args)
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
        <Input placeholder="例: 給与" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </TextField>

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

      <NumberField
        isInvalid={!!errors.dayOfMonth}
        isDisabled={submitting}
        minValue={1}
        maxValue={31}
        value={dayOfMonth}
        onChange={setDayOfMonth}
      >
        <Label>毎月◯日</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="flex-1" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {errors.dayOfMonth && <FieldError>{errors.dayOfMonth}</FieldError>}
      </NumberField>

      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          終了日（任意）
          <input
            type="date"
            disabled={submitting}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        {endDate.length > 0 && (
          <Button variant="tertiary" onPress={() => setEndDate('')} isDisabled={submitting}>
            クリア
          </Button>
        )}
      </div>

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
