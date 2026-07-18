import { Suspense, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction, useMutation } from 'convex/react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Modal,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { DEFAULT_NOTIFY_AFTER_MINUTES, NOTIFY_OPTIONS } from '../constants'
import { formatDateTime, formatDuration, formatTime, toDatetimeLocalValue } from '../lib/format'
import {
  getDeviceId,
  getExistingSubscription,
  isIos,
  isPushSupported,
  isStandalone,
  registerServiceWorker,
  subscribeToPush,
} from '../lib/push'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

function HomeComponent() {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    setDeviceId(getDeviceId())
  }, [])

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1} fz={{ base: 'h2', sm: 'h1' }}>💊 ロキソニンリマインダー</Title>
          <Text c="dimmed">
            服用を記録すると、効果が切れる前にプッシュ通知でお知らせします
          </Text>
        </Stack>

        {deviceId ? (
          <Suspense fallback={<Text c="dimmed">読み込み中…</Text>}>
            <MainContent deviceId={deviceId} />
          </Suspense>
        ) : (
          <Text c="dimmed">読み込み中…</Text>
        )}

        <Text size="xs" c="dimmed">
          本アプリは服薬管理の補助です。用法・用量は医師・薬剤師の指示に従ってください。
        </Text>
      </Stack>
    </Container>
  )
}

function MainContent({ deviceId }: { deviceId: string }) {
  const { data: device } = useSuspenseQuery(convexQuery(api.devices.get, { deviceId }))
  const { data: doses } = useSuspenseQuery(convexQuery(api.doses.list, { deviceId }))

  const notifyAfterMinutes = device?.notifyAfterMinutes ?? DEFAULT_NOTIFY_AFTER_MINUTES
  const hasSubscription = device?.hasSubscription ?? false

  const lastDose = doses[0] as Doc<'doses'> | undefined
  const pendingDose = doses.find((dose) => !dose.notified)

  return (
    <>
      <NotificationSetupCard deviceId={deviceId} hasSubscription={hasSubscription} />
      <TakeDoseSection deviceId={deviceId} lastDose={lastDose} />
      {pendingDose && <NextNotificationCard dose={pendingDose} />}
      <SettingsCard deviceId={deviceId} notifyAfterMinutes={notifyAfterMinutes} />
      <HistoryCard deviceId={deviceId} doses={doses} />
    </>
  )
}

function testFailureMessage(reason: string | undefined): string {
  switch (reason) {
    case 'no-subscription':
      return '通知の購読情報が見つかりませんでした。もう一度「プッシュ通知を有効にする」をお試しください。'
    case 'expired':
      return '通知の購読が失効しました。もう一度「プッシュ通知を有効にする」をお試しください。'
    case 'send-failed':
    default:
      return 'テスト通知の送信に失敗しました。'
  }
}

function NotificationSetupCard({
  deviceId,
  hasSubscription,
}: {
  deviceId: string
  hasSubscription: boolean
}) {
  const saveSubscription = useMutation(api.devices.saveSubscription)
  const removeSubscription = useMutation(api.devices.removeSubscription)
  const sendTest = useAction(api.push.sendTest)

  const [supported, setSupported] = useState<boolean | null>(null)
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)

  useEffect(() => {
    const pushSupported = isPushSupported()
    setSupported(pushSupported)
    if (isIos() && !isStandalone()) {
      setIosNeedsInstall(true)
    }
    if (pushSupported) {
      setPermission(Notification.permission)
    }
  }, [])

  // ブラウザ側の実際の購読状態と DB 上の hasSubscription を照合し、ずれを解消する。
  useEffect(() => {
    if (supported !== true) {
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const registration = await registerServiceWorker()
        const browserSubscription = await getExistingSubscription(registration)
        if (cancelled) {
          return
        }
        if (hasSubscription && !browserSubscription) {
          // DB 上は購読済みだがブラウザ側に subscription が無い → 未購読状態に戻す
          await removeSubscription({ deviceId })
        } else if (!hasSubscription && browserSubscription) {
          // ブラウザ側には subscription があるのに DB 側に無い → 再同期する
          await saveSubscription({
            deviceId,
            subscription: JSON.stringify(browserSubscription),
          })
        }
      } catch {
        // 照合に失敗しても致命的ではない(手動で「プッシュ通知を有効にする」から再設定できる)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supported, deviceId, hasSubscription, removeSubscription, saveSubscription])

  async function handleSubscribe() {
    setSubscribeError(null)
    setIsSubscribing(true)
    try {
      const registration = await registerServiceWorker()
      const subscription = await subscribeToPush(registration)
      setPermission(Notification.permission)
      if (!subscription) {
        setSubscribeError('通知の許可が得られませんでした。')
        return
      }
      await saveSubscription({ deviceId, subscription: JSON.stringify(subscription) })
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : '通知の設定に失敗しました。')
    } finally {
      setIsSubscribing(false)
    }
  }

  async function handleTest() {
    setTestMessage(null)
    setIsTesting(true)
    try {
      const result = await sendTest({ deviceId })
      setTestMessage(result.ok ? 'テスト通知を送信しました。' : testFailureMessage(result.reason))
    } catch (err) {
      setTestMessage(err instanceof Error ? err.message : 'テスト通知の送信に失敗しました。')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Title order={3}>通知セットアップ</Title>

        {supported === false && (
          <Alert color="yellow">このブラウザはプッシュ通知に未対応です</Alert>
        )}

        {iosNeedsInstall && (
          <Alert color="blue">
            iPhone/iPad では、共有メニューから「ホーム画面に追加」し、追加したアイコンから開くと通知を有効化できます
          </Alert>
        )}

        {permission === 'denied' && (
          <Alert color="red">通知がブロックされています。ブラウザの設定から許可してください</Alert>
        )}

        {subscribeError && (
          <Text c="red" size="sm">
            {subscribeError}
          </Text>
        )}

        {!hasSubscription && supported === true && permission !== 'denied' && (
          <Button onClick={handleSubscribe} loading={isSubscribing}>
            プッシュ通知を有効にする
          </Button>
        )}

        {hasSubscription && permission !== 'denied' && (
          <Group>
            <Badge color="teal">通知オン</Badge>
            <Button variant="light" onClick={handleTest} loading={isTesting}>
              テスト通知を送る
            </Button>
          </Group>
        )}

        {testMessage && (
          <Text size="sm" c="dimmed">
            {testMessage}
          </Text>
        )}
      </Stack>
    </Card>
  )
}

function TakeDoseSection({
  deviceId,
  lastDose,
}: {
  deviceId: string
  lastDose: Doc<'doses'> | undefined
}) {
  const take = useMutation(api.doses.take)
  const [modalOpened, setModalOpened] = useState(false)
  const [isTaking, setIsTaking] = useState(false)
  const [justTaken, setJustTaken] = useState(false)
  const [takeError, setTakeError] = useState<string | null>(null)
  const justTakenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [backfillModalOpened, setBackfillModalOpened] = useState(false)
  const [backfillValue, setBackfillValue] = useState('')
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [isSubmittingBackfill, setIsSubmittingBackfill] = useState(false)

  const elapsedSinceLastMs = lastDose ? Date.now() - lastDose.takenAt : null

  useEffect(() => {
    return () => {
      if (justTakenTimerRef.current) {
        clearTimeout(justTakenTimerRef.current)
      }
    }
  }, [])

  function showJustTaken() {
    setJustTaken(true)
    if (justTakenTimerRef.current) {
      clearTimeout(justTakenTimerRef.current)
    }
    justTakenTimerRef.current = setTimeout(() => setJustTaken(false), 4000)
  }

  async function recordDose() {
    setTakeError(null)
    setIsTaking(true)
    try {
      await take({ deviceId })
      setModalOpened(false)
      showJustTaken()
    } catch (err) {
      setModalOpened(false)
      setTakeError(err instanceof Error ? err.message : '記録に失敗しました。')
    } finally {
      setIsTaking(false)
    }
  }

  function handleClick() {
    if (elapsedSinceLastMs !== null && elapsedSinceLastMs < FOUR_HOURS_MS) {
      setModalOpened(true)
    } else {
      void recordDose()
    }
  }

  function openBackfillModal() {
    setBackfillValue(toDatetimeLocalValue(Date.now()))
    setBackfillError(null)
    setBackfillModalOpened(true)
  }

  async function handleBackfillSubmit() {
    setBackfillError(null)
    const parsed = new Date(backfillValue).getTime()
    if (Number.isNaN(parsed)) {
      setBackfillError('日時を入力してください')
      return
    }
    if (parsed > Date.now()) {
      setBackfillError('未来の日時は指定できません')
      return
    }

    setIsSubmittingBackfill(true)
    try {
      await take({ deviceId, takenAt: parsed })
      setBackfillModalOpened(false)
      showJustTaken()
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : '記録に失敗しました。')
    } finally {
      setIsSubmittingBackfill(false)
    }
  }

  return (
    <Stack gap="xs">
      <Button size="xl" fullWidth onClick={handleClick} loading={isTaking}>
        💊 いま飲んだ
      </Button>
      <Button variant="subtle" size="xs" onClick={openBackfillModal}>
        過去の服用を記録する
      </Button>
      {justTaken && (
        <Text c="teal" size="sm" ta="center">
          記録しました
        </Text>
      )}
      {takeError && (
        <Text c="red" size="sm" ta="center">
          {takeError}
        </Text>
      )}

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="服用の確認">
        <Stack gap="md">
          <Text>
            前回の服用から{formatDuration(Math.round((elapsedSinceLastMs ?? 0) / 60000))}
            しか経っていません。ロキソニンは通常4時間以上あけて服用します。記録しますか？
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpened(false)}>
              やめる
            </Button>
            <Button color="red" onClick={recordDose} loading={isTaking}>
              記録する
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={backfillModalOpened}
        onClose={() => setBackfillModalOpened(false)}
        title="過去の服用を記録する"
      >
        <Stack gap="md">
          <TextInput
            type="datetime-local"
            label="服用した日時"
            value={backfillValue}
            onChange={(event) => setBackfillValue(event.currentTarget.value)}
            max={toDatetimeLocalValue(Date.now())}
          />
          <Text size="xs" c="dimmed">
            通知は最も新しい服用時刻を基準に送られます
          </Text>
          {backfillError && (
            <Text c="red" size="sm">
              {backfillError}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setBackfillModalOpened(false)}>
              やめる
            </Button>
            <Button onClick={handleBackfillSubmit} loading={isSubmittingBackfill}>
              記録する
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

function NextNotificationCard({ dose }: { dose: Doc<'doses'> }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const total = dose.notifyAt - dose.takenAt
  const elapsed = Math.min(Math.max(now - dose.takenAt, 0), total > 0 ? total : 0)
  const progress = total > 0 ? (elapsed / total) * 100 : 100
  const remainingMinutes = Math.max(0, Math.round((dose.notifyAt - now) / 60000))

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Text fw={600}>
          次の通知: {formatTime(dose.notifyAt)}（あと{formatDuration(remainingMinutes)}）
        </Text>
        <Progress value={progress} />
      </Stack>
    </Card>
  )
}

function SettingsCard({
  deviceId,
  notifyAfterMinutes,
}: {
  deviceId: string
  notifyAfterMinutes: number
}) {
  const updateSettings = useMutation(api.devices.updateSettings)
  const [isSaving, setIsSaving] = useState(false)

  async function handleChange(value: string | null) {
    if (!value) {
      return
    }
    setIsSaving(true)
    try {
      await updateSettings({ deviceId, notifyAfterMinutes: Number(value) })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Select
          label="通知タイミング（服用からの経過時間）"
          data={NOTIFY_OPTIONS.map((minutes) => ({
            value: String(minutes),
            label: `${formatDuration(minutes)}後`,
          }))}
          value={String(notifyAfterMinutes)}
          onChange={handleChange}
          disabled={isSaving}
          allowDeselect={false}
        />
        <Text size="xs" c="dimmed">
          ロキソニンの効果は約4〜5時間で切れるため、少し前の通知がおすすめです
        </Text>
      </Stack>
    </Card>
  )
}

function HistoryCard({ deviceId, doses }: { deviceId: string; doses: Doc<'doses'>[] }) {
  const remove = useMutation(api.doses.remove)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayCount = doses.filter((dose) => dose.takenAt >= todayStart.getTime()).length

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Text fw={600}>今日の服用: {todayCount}回</Text>
        {todayCount >= 3 && (
          <Text c="red" size="sm">
            1日3回までが目安です
          </Text>
        )}

        <Stack gap="xs">
          {doses.length === 0 ? (
            <Text c="dimmed" size="sm">
              まだ記録がありません
            </Text>
          ) : (
            doses.map((dose) => (
              <Group key={dose._id} justify="space-between" wrap="nowrap">
                <Group gap="xs">
                  <Text size="sm">{formatDateTime(dose.takenAt)}</Text>
                  <Badge color={dose.notified ? 'gray' : 'indigo'}>
                    {dose.notified ? '通知済み' : '通知予約中'}
                  </Badge>
                </Group>
                <Tooltip label="記録を削除">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => void remove({ deviceId, doseId: dose._id })}
                    aria-label="記録を削除"
                  >
                    🗑
                  </ActionIcon>
                </Tooltip>
              </Group>
            ))
          )}
        </Stack>
      </Stack>
    </Card>
  )
}
