import { useState, type FormEvent } from 'react'
import { Button, Drawer, FieldError, Label, NumberField, Spinner } from '@heroui/react'
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
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>残高を合わせる</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && <ReconcileForm currentBalance={currentBalance} onClose={onClose} />}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function ReconcileForm({ currentBalance, onClose }: { currentBalance: number; onClose: () => void }) {
  const setAnchor = useMutation(api.settings.setAnchor)
  const [submitting, setSubmitting] = useState(false)
  const [balance, setBalance] = useState<number | undefined>(currentBalance)
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
      onClose()
    } catch (err) {
      notifyError(err, '残高の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        銀行口座の現在残高を入力してください。今日以前の入出金はすべて反映済みとして、
        明日以降の予定だけで再計算されます。
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
        <Label>現在残高</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="flex-1" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {error && <FieldError>{error}</FieldError>}
      </NumberField>

      <Button type="submit" isPending={submitting} isDisabled={submitting}>
        {submitting && <Spinner color="current" size="sm" />}
        保存
      </Button>

      <p className="text-xs text-muted">
        今日付けでまだ引き落とされていない予定がある場合は、引き落とし後に合わせ直してください。
      </p>
    </form>
  )
}
