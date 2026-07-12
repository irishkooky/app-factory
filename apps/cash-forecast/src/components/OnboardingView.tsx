import { useState, type FormEvent } from 'react'
import { Button, Card, FieldError, Label, NumberField, Spinner } from '@heroui/react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { todayJST } from '../lib/date'
import { notifyError, notifySaved } from '../lib/notify'

export function OnboardingView() {
  const setAnchor = useMutation(api.settings.setAnchor)
  const [submitting, setSubmitting] = useState(false)
  const [balance, setBalance] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (balance === undefined) {
      setError('残高を入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await setAnchor({ anchorDate: todayJST(), anchorBalance: Math.round(balance) })
      notifySaved()
    } catch (err) {
      notifyError(err, '初期設定に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <Card.Content>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">ようこそ</h2>
          <p className="text-sm text-muted">
            現在の預金残高を入力してスタートしてください。今日時点の残高として記録し、
            そこから未来の予定を積み上げて予測します。
          </p>

          <NumberField
            isInvalid={error !== null}
            isDisabled={submitting}
            minValue={-1_000_000_000}
            maxValue={1_000_000_000}
            value={balance}
            onChange={setBalance}
            formatOptions={{ style: 'currency', currency: 'JPY' }}
          >
            <Label>現在の預金残高</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className="flex-1" placeholder="¥1,000,000" />
              <NumberField.IncrementButton />
            </NumberField.Group>
            {error && <FieldError>{error}</FieldError>}
          </NumberField>

          <Button type="submit" isPending={submitting} isDisabled={submitting}>
            {submitting && <Spinner color="current" size="sm" />}
            はじめる
          </Button>
        </form>
      </Card.Content>
    </Card>
  )
}
