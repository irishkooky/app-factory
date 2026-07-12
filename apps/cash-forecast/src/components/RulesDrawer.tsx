import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Loader,
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
import type { Doc } from '../../convex/_generated/dataModel'
import { formatYen } from '../lib/money'
import { notifyDeleted, notifyError, notifySaved } from '../lib/notify'
import { UpgradeButton, usePlan } from './BillingControls'

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
    <Drawer opened={opened} onClose={onClose} position="bottom" title="ルール管理" size="md">
      {opened && <RulesDrawerContent rules={rules} />}
    </Drawer>
  )
}

function RulesDrawerContent({ rules }: { rules: Doc<'rules'>[] | undefined }) {
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editingRule, setEditingRule] = useState<Doc<'rules'> | null>(null)
  const removeRule = useMutation(api.rules.remove)
  const { plan } = usePlan()
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

  const handleDelete = (rule: Doc<'rules'>) => {
    modals.openConfirmModal({
      title: '削除の確認',
      children: (
        <Text size="sm">「{rule.name}」を削除しますか？確定済みの過去分は残ります。</Text>
      ),
      labels: { confirm: '削除', cancel: 'キャンセル' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        void doDelete(rule)
      },
    })
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
    <Stack gap="md">
      {rules === undefined ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : rules.length === 0 ? (
        <Stack gap="md" align="center" py="xl">
          <Text c="dimmed" ta="center">
            給与や毎月の引き落としをルールにすると、未来の残高が自動で予測されます。
          </Text>
          <Button onClick={handleAdd}>＋ルールを追加</Button>
        </Stack>
      ) : (
        <>
          <Stack gap="sm">
            {rules.map((rule) => (
              <Card key={rule._id} withBorder radius="md" padding="sm">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={500}>{rule.name}</Text>
                    <Text size="sm" c={rule.kind === 'expense' ? 'red.7' : 'blue.7'}>
                      {rule.kind === 'expense' ? '-' : '+'}
                      {formatYen(rule.amount)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      毎月{rule.dayOfMonth}日
                      {rule.endDate ? `（${rule.endDate}まで）` : ''}
                    </Text>
                  </Stack>
                  <Group gap="xs" style={{ flexShrink: 0 }}>
                    <Button variant="subtle" size="xs" onClick={() => handleEdit(rule)}>
                      編集
                    </Button>
                    <Button variant="subtle" color="red" size="xs" onClick={() => handleDelete(rule)}>
                      削除
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
          <Button onClick={handleAdd} disabled={atFreeLimit}>
            ＋ルールを追加
          </Button>
          {atFreeLimit && (
            <Stack gap={6}>
              <Text size="sm" c="dimmed">
                Freeプランはルール{FREE_RULE_LIMIT}件まで。Proプランなら無制限です
              </Text>
              <UpgradeButton size="xs" />
            </Stack>
          )}
        </>
      )}
    </Stack>
  )
}

type RuleFormValues = {
  name: string
  kind: 'income' | 'expense'
  amount: number | string
  dayOfMonth: number | string
  endDate: string
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

  const form = useForm<RuleFormValues>({
    initialValues: {
      name: rule?.name ?? '',
      kind: rule?.kind ?? 'expense',
      amount: rule?.amount ?? '',
      dayOfMonth: rule?.dayOfMonth ?? 1,
      endDate: rule?.endDate ?? '',
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? '名前を入力してください' : null),
      amount: (value) => (typeof value !== 'number' ? '金額を入力してください' : null),
      dayOfMonth: (value) =>
        typeof value !== 'number' || value < 1 || value > 31
          ? '日は1から31の間で入力してください'
          : null,
    },
  })

  const handleSubmit = async (values: RuleFormValues) => {
    if (typeof values.amount !== 'number' || typeof values.dayOfMonth !== 'number') return
    setSubmitting(true)
    try {
      const args = {
        name: values.name,
        kind: values.kind,
        amount: Math.round(values.amount),
        dayOfMonth: Math.round(values.dayOfMonth),
        endDate: values.endDate.length > 0 ? values.endDate : undefined,
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
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="名前"
          placeholder="例: 給与"
          disabled={submitting}
          {...form.getInputProps('name')}
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

        <NumberInput
          label="金額"
          thousandSeparator=","
          hideControls
          min={0}
          max={1_000_000_000}
          prefix="¥"
          inputMode="numeric"
          disabled={submitting}
          {...form.getInputProps('amount')}
        />

        <NumberInput
          label="毎月◯日"
          hideControls
          min={1}
          max={31}
          disabled={submitting}
          {...form.getInputProps('dayOfMonth')}
        />

        <Group align="flex-end" gap="xs">
          <TextInput
            type="date"
            label="終了日（任意）"
            disabled={submitting}
            style={{ flex: 1 }}
            {...form.getInputProps('endDate')}
          />
          {form.values.endDate.length > 0 && (
            <Button variant="subtle" onClick={() => form.setFieldValue('endDate', '')} disabled={submitting}>
              クリア
            </Button>
          )}
        </Group>

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
