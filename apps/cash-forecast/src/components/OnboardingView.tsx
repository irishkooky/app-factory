import { useState } from 'react'
import { Alert, Button, Card, NumberInput, Stack, Text, Title } from '@mantine/core'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { todayJST } from '../lib/date'

export function OnboardingView() {
  const setAnchor = useMutation(api.settings.setAnchor)
  const [balance, setBalance] = useState<number | string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    if (typeof balance !== 'number') {
      setError('残高を入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await setAnchor({ anchorDate: todayJST(), anchorBalance: Math.round(balance) })
    } catch (err) {
      setError(err instanceof Error ? err.message : '初期設定に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Title order={2}>ようこそ</Title>
        <Text c="dimmed" size="sm">
          現在の預金残高を入力してスタートしてください。今日時点の残高として記録し、
          そこから未来の予定を積み上げて予測します。
        </Text>

        {error && (
          <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
            {error}
          </Alert>
        )}

        <NumberInput
          label="現在の預金残高"
          placeholder="1000000"
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

        <Button onClick={handleStart} loading={submitting} disabled={submitting}>
          はじめる
        </Button>
      </Stack>
    </Card>
  )
}
