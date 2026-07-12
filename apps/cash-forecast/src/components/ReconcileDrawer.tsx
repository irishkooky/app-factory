import { useState } from 'react'
import { Button, Drawer, NumberInput, Stack, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { todayJST } from '../lib/date'
import { notifyError, notifySaved } from '../lib/notify'

type ReconcileDrawerProps = {
  opened: boolean
  onClose: () => void
  currentBalance: number
}

export function ReconcileDrawer({ opened, onClose, currentBalance }: ReconcileDrawerProps) {
  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" title="残高を合わせる">
      {opened && <ReconcileForm currentBalance={currentBalance} onClose={onClose} />}
    </Drawer>
  )
}

type ReconcileFormValues = {
  balance: number | string
}

function ReconcileForm({ currentBalance, onClose }: { currentBalance: number; onClose: () => void }) {
  const setAnchor = useMutation(api.settings.setAnchor)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ReconcileFormValues>({
    initialValues: { balance: currentBalance },
    validate: {
      balance: (value) => (typeof value !== 'number' ? '残高を入力してください' : null),
    },
  })

  const handleSubmit = async (values: ReconcileFormValues) => {
    if (typeof values.balance !== 'number') return
    setSubmitting(true)
    try {
      await setAnchor({ anchorDate: todayJST(), anchorBalance: Math.round(values.balance) })
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, '残高の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          銀行口座の現在残高を入力してください。今日以前の入出金はすべて反映済みとして、
          明日以降の予定だけで再計算されます。
        </Text>

        <NumberInput
          label="現在残高"
          thousandSeparator=","
          hideControls
          min={-1_000_000_000}
          max={1_000_000_000}
          prefix="¥"
          inputMode="numeric"
          disabled={submitting}
          {...form.getInputProps('balance')}
        />

        <Button type="submit" loading={submitting} disabled={submitting}>
          保存
        </Button>

        <Text size="xs" c="dimmed">
          今日付けでまだ引き落とされていない予定がある場合は、引き落とし後に合わせ直してください。
        </Text>
      </Stack>
    </form>
  )
}
