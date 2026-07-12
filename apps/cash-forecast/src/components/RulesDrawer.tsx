import { useState } from 'react'
import {
  Alert,
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
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { formatYen } from '../lib/money'

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
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    setEditingRule(null)
    setMode('form')
  }

  const handleEdit = (rule: Doc<'rules'>) => {
    setEditingRule(rule)
    setMode('form')
  }

  const handleDelete = async (rule: Doc<'rules'>) => {
    if (!window.confirm(`「${rule.name}」を削除しますか？確定済みの過去分は残ります。`)) return
    setError(null)
    try {
      await removeRule({ id: rule._id })
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    }
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
      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

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
          <Button onClick={handleAdd}>＋ルールを追加</Button>
        </>
      )}
    </Stack>
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

  const [name, setName] = useState(rule?.name ?? '')
  const [kind, setKind] = useState<'income' | 'expense'>(rule?.kind ?? 'expense')
  const [amount, setAmount] = useState<number | string>(rule?.amount ?? '')
  const [dayOfMonth, setDayOfMonth] = useState<number | string>(rule?.dayOfMonth ?? 1)
  const [endDate, setEndDate] = useState(rule?.endDate ?? '')
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
    if (typeof dayOfMonth !== 'number' || dayOfMonth < 1 || dayOfMonth > 31) {
      setError('日は1から31の間で入力してください')
      return
    }
    setError(null)
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
        placeholder="例: 給与"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
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

      <NumberInput
        label="金額"
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

      <NumberInput
        label="毎月◯日"
        value={dayOfMonth}
        onChange={setDayOfMonth}
        hideControls
        min={1}
        max={31}
        disabled={submitting}
      />

      <Group align="flex-end" gap="xs">
        <TextInput
          type="date"
          label="終了日（任意）"
          value={endDate}
          onChange={(event) => setEndDate(event.currentTarget.value)}
          disabled={submitting}
          style={{ flex: 1 }}
        />
        {endDate.length > 0 && (
          <Button variant="subtle" onClick={() => setEndDate('')} disabled={submitting}>
            クリア
          </Button>
        )}
      </Group>

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
