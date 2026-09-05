import { useState, type FormEvent } from 'react'
import { Button, Card, Spinner } from '@heroui/react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { todayJST } from '../lib/date'
import { MoneyField } from './MoneyField'
import { notifyError, notifySaved } from '../lib/notify'

export function OnboardingView() {
  const setAnchor = useMutation(api.settings.setAnchor)
  const [submitting, setSubmitting] = useState(false)
  const [balance, setBalance] = useState<number | undefined>(1_000_000)
  const [error, setError] = useState<string | null>(null)

  const handleBalanceChange = (v: number | undefined) => {
    setBalance(v)
    if (v !== undefined) setError(null)
  }

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

          <MoneyField
            label="現在の預金残高"
            value={balance}
            onChange={handleBalanceChange}
            error={error ?? undefined}
            isDisabled={submitting}
            allowNegative
          />

          <Button type="submit" isPending={submitting} isDisabled={submitting}>
            {submitting && <Spinner color="current" size="sm" />}
            はじめる
          </Button>
        </form>
      </Card.Content>
    </Card>
  )
}
