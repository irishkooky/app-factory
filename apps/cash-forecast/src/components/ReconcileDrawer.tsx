import { useState } from 'react'
import { Alert, Button, Drawer, NumberInput, Stack, Text } from '@mantine/core'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { todayJST } from '../lib/date'

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

function ReconcileForm({ currentBalance, onClose }: { currentBalance: number; onClose: () => void }) {
  const setAnchor = useMutation(api.settings.setAnchor)
  const [balance, setBalance] = useState<number | string>(currentBalance)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (typeof balance !== 'number') {
      setError('残高を入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await setAnchor({ anchorDate: todayJST(), anchorBalance: Math.round(balance) })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '残高の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        銀行口座の現在残高を入力してください。今日以前の入出金はすべて反映済みとして、
        明日以降の予定だけで再計算されます。
      </Text>

      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <NumberInput
        label="現在残高"
        value={balance}
        onChange={setBalance}
        thousandSeparator=","
        hideControls
        min={-1_000_000_000}
        max={1_000_000_000}
        prefix="¥"
        inputMode="numeric"
        disabled={submitting}
      />

      <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
        保存
      </Button>

      <Text size="xs" c="dimmed">
        今日付けでまだ引き落とされていない予定がある場合は、引き落とし後に合わせ直してください。
      </Text>
    </Stack>
  )
}
