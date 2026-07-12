import { useState } from 'react'
import { Button, Card, NumberInput, Stack, Text, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { todayJST } from '../lib/date'
import { notifyError, notifySaved } from '../lib/notify'

type OnboardingFormValues = {
  balance: number | string
}

export function OnboardingView() {
  const setAnchor = useMutation(api.settings.setAnchor)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<OnboardingFormValues>({
    initialValues: { balance: '' },
    validate: {
      balance: (value) => (typeof value !== 'number' ? '残高を入力してください' : null),
    },
  })

  const handleSubmit = async (values: OnboardingFormValues) => {
    if (typeof values.balance !== 'number') return
    setSubmitting(true)
    try {
      await setAnchor({ anchorDate: todayJST(), anchorBalance: Math.round(values.balance) })
      notifySaved()
    } catch (err) {
      notifyError(err, '初期設定に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Title order={2}>ようこそ</Title>
          <Text c="dimmed" size="sm">
            現在の預金残高を入力してスタートしてください。今日時点の残高として記録し、
            そこから未来の予定を積み上げて予測します。
          </Text>

          <NumberInput
            label="現在の預金残高"
            placeholder="1000000"
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
            はじめる
          </Button>
        </Stack>
      </form>
    </Card>
  )
}
