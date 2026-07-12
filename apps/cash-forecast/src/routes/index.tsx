import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  Affix,
  Alert,
  Button,
  Container,
  Drawer,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { addMonthsToDateClamped, formatDateShort, todayJST } from '../lib/date'
import { buildForecast, type ForecastRow } from '../lib/forecast'
import { formatYen } from '../lib/money'
import { OnboardingView } from '../components/OnboardingView'
import { ForecastList } from '../components/ForecastList'
import { TransactionDrawer } from '../components/TransactionDrawer'
import { ReconcileDrawer } from '../components/ReconcileDrawer'
import { RulesDrawer } from '../components/RulesDrawer'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <Container size="xs" py="md">
      <Stack gap="lg">
        <AuthLoading>
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        </AuthLoading>

        <Unauthenticated>
          <UnauthenticatedView />
        </Unauthenticated>

        <Authenticated>
          <AuthenticatedView />
        </Authenticated>
      </Stack>
    </Container>
  )
}

function UnauthenticatedView() {
  return (
    <Stack gap="lg">
      <Title order={1}>残高予測</Title>
      <Text c="dimmed">基準残高と毎月の予定から、これから12ヶ月の残高推移を予測します。</Text>
      <SignInButton mode="modal">
        <Button size="md">Googleでログイン</Button>
      </SignInButton>
    </Stack>
  )
}

function AuthenticatedView() {
  const settings = useQuery(api.settings.get)

  if (settings === undefined) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    )
  }

  if (settings === null) {
    return <OnboardingView />
  }

  return <ForecastView settings={settings} />
}

function ForecastView({ settings }: { settings: Doc<'settings'> }) {
  const today = todayJST()
  const horizonEnd = addMonthsToDateClamped(today, 12)

  const transactions = useQuery(api.transactions.listAfter, { after: settings.anchorDate })
  const rules = useQuery(api.rules.list)

  const [txDrawerOpen, setTxDrawerOpen] = useState(false)
  const [txDrawerTarget, setTxDrawerTarget] = useState<ForecastRow | null>(null)
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [thresholdOpen, setThresholdOpen] = useState(false)

  const forecast = useMemo(() => {
    if (transactions === undefined || rules === undefined) return undefined
    return buildForecast({
      anchorDate: settings.anchorDate,
      anchorBalance: settings.anchorBalance,
      threshold: settings.threshold,
      rules,
      transactions,
      horizonEnd,
    })
  }, [transactions, rules, settings.anchorDate, settings.anchorBalance, settings.threshold, horizonEnd])

  if (forecast === undefined) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    )
  }

  // 現在残高: date <= today の最後の行のbalance。無ければ anchorBalance。
  let currentBalance = settings.anchorBalance
  for (const row of forecast) {
    if (row.date <= today) {
      currentBalance = row.balance
    } else {
      break
    }
  }

  // 今後12ヶ月の最低残高: date >= today の行から。無ければ全行から。
  const futureRows = forecast.filter((row) => row.date >= today)
  const minSource = futureRows.length > 0 ? futureRows : forecast
  let minBalance = currentBalance
  let minDate = today
  if (minSource.length > 0) {
    let minRow = minSource[0]
    for (const row of minSource) {
      if (row.balance < minRow.balance) minRow = row
    }
    minBalance = minRow.balance
    minDate = minRow.date
  }
  const belowThresholdNow = minBalance < settings.threshold

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={4}>残高予測</Title>
        <UserButton />
      </Group>

      <Stack gap={4}>
        <Text
          fz={36}
          fw={700}
          c={currentBalance < 0 ? 'red.7' : undefined}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatYen(currentBalance)}
        </Text>
        <Text size="sm" c={belowThresholdNow ? 'orange.7' : 'dimmed'}>
          今後12ヶ月の最低残高 {formatYen(minBalance)}（{formatDateShort(minDate)}）
        </Text>
      </Stack>

      <Group grow>
        <Button variant="light" size="xs" onClick={() => setReconcileOpen(true)}>
          残高を合わせる
        </Button>
        <Button variant="light" size="xs" onClick={() => setRulesOpen(true)}>
          ルール管理
        </Button>
        <Button variant="light" size="xs" onClick={() => setThresholdOpen(true)}>
          しきい値
        </Button>
      </Group>

      <ForecastList
        rows={forecast}
        today={today}
        onRowClick={(row) => {
          setTxDrawerTarget(row)
          setTxDrawerOpen(true)
        }}
      />

      <Affix position={{ bottom: 24, right: 24 }}>
        <ActionIcon
          size="xl"
          radius="xl"
          aria-label="取引を追加"
          onClick={() => {
            setTxDrawerTarget(null)
            setTxDrawerOpen(true)
          }}
        >
          <Text fz={24} fw={700} lh={1}>
            ＋
          </Text>
        </ActionIcon>
      </Affix>

      <TransactionDrawer
        opened={txDrawerOpen}
        onClose={() => setTxDrawerOpen(false)}
        anchorDate={settings.anchorDate}
        today={today}
        target={txDrawerTarget}
      />

      <ReconcileDrawer
        opened={reconcileOpen}
        onClose={() => setReconcileOpen(false)}
        currentBalance={currentBalance}
      />

      <RulesDrawer opened={rulesOpen} onClose={() => setRulesOpen(false)} rules={rules} />

      <ThresholdDrawer
        opened={thresholdOpen}
        onClose={() => setThresholdOpen(false)}
        currentThreshold={settings.threshold}
      />
    </Stack>
  )
}

function ThresholdDrawer({
  opened,
  onClose,
  currentThreshold,
}: {
  opened: boolean
  onClose: () => void
  currentThreshold: number
}) {
  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" title="しきい値">
      {opened && <ThresholdForm currentThreshold={currentThreshold} onClose={onClose} />}
    </Drawer>
  )
}

function ThresholdForm({
  currentThreshold,
  onClose,
}: {
  currentThreshold: number
  onClose: () => void
}) {
  const setThreshold = useMutation(api.settings.setThreshold)
  const [value, setValue] = useState<number | string>(currentThreshold)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (typeof value !== 'number') {
      setError('しきい値を入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await setThreshold({ threshold: Math.round(value) })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'しきい値の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        残高がこの金額を下回る行を強調表示します。
      </Text>

      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <NumberInput
        label="しきい値"
        value={value}
        onChange={setValue}
        thousandSeparator=","
        hideControls
        min={0}
        max={1_000_000_000}
        prefix="¥"
        inputMode="numeric"
        disabled={submitting}
      />

      <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
        保存
      </Button>
    </Stack>
  )
}
