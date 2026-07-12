import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  Affix,
  Button,
  Container,
  Drawer,
  Group,
  Loader,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconPlus } from '@tabler/icons-react'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { addMonthsToDateClamped, formatDateShort, todayJST } from '../lib/date'
import { buildForecast, type ForecastRow } from '../lib/forecast'
import { buildBalanceSeries } from '../lib/chart'
import { formatYen } from '../lib/money'
import { notifyError, notifySaved } from '../lib/notify'
import { OnboardingView } from '../components/OnboardingView'
import { ForecastList } from '../components/ForecastList'
import { TransactionDrawer } from '../components/TransactionDrawer'
import { ReconcileDrawer } from '../components/ReconcileDrawer'
import { RulesDrawer } from '../components/RulesDrawer'
import { MonthlySummaryDrawer } from '../components/MonthlySummaryDrawer'
import { BalanceChart } from '../components/BalanceChart'
import { BillingButton, PlanBadge, ProGate } from '../components/BillingControls'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

// Stripe Checkoutから戻ったときの案内。?billing=success/cancel を読み取り、
// successなら通知を出して、いずれの場合もクエリはURLから取り除く（SSR時はwindowに触れない）。
function useBillingReturnNotice() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const billing = params.get('billing')
    if (billing === null) return

    if (billing === 'success') {
      notifications.show({
        title: '決済を受け付けました',
        message: 'プランへの反映まで数秒かかることがあります。',
        color: 'teal',
        autoClose: 8000,
      })
    }
    params.delete('billing')
    const query = params.toString()
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', newUrl)
  }, [])
}

function HomeComponent() {
  useBillingReturnNotice()

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
  const [monthlySummaryOpen, setMonthlySummaryOpen] = useState(false)

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

  const balancePoints = useMemo(() => {
    if (forecast === undefined) return undefined
    return buildBalanceSeries({
      anchorDate: settings.anchorDate,
      anchorBalance: settings.anchorBalance,
      rows: forecast,
      today,
      horizonEnd,
    })
  }, [forecast, settings.anchorDate, settings.anchorBalance, today, horizonEnd])

  if (forecast === undefined || balancePoints === undefined) {
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

  // Drawerを開いたまま上乗せの追加・削除等で予測が更新されても、
  // 内訳・合計の表示が追従するよう、対象行のライブ版を引き直して渡す
  const liveDrawerTarget = txDrawerTarget
    ? (forecast.find((row) => row.key === txDrawerTarget.key) ?? txDrawerTarget)
    : null

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={4}>残高予測</Title>
        <Group gap="xs">
          <PlanBadge />
          <UserButton />
        </Group>
      </Group>

      <Stack gap={4}>
        <Text fz={36} fw={700} c={currentBalance < 0 ? 'red.7' : undefined}>
          {formatYen(currentBalance)}
        </Text>
        <Text size="sm" c={belowThresholdNow ? 'orange.7' : 'dimmed'}>
          今後12ヶ月の最低残高 {formatYen(minBalance)}（{formatDateShort(minDate)}）
        </Text>
      </Stack>

      <ProGate title="残高推移グラフ" description="グラフ表示はProプラン限定です">
        <BalanceChart points={balancePoints} threshold={settings.threshold} today={today} />
      </ProGate>

      <SimpleGrid cols={2} spacing="xs">
        <Button variant="light" size="xs" onClick={() => setReconcileOpen(true)}>
          残高を合わせる
        </Button>
        <Button variant="light" size="xs" onClick={() => setRulesOpen(true)}>
          ルール管理
        </Button>
        <Button variant="light" size="xs" onClick={() => setThresholdOpen(true)}>
          しきい値
        </Button>
        <Button variant="light" size="xs" onClick={() => setMonthlySummaryOpen(true)}>
          月次
        </Button>
        <BillingButton variant="light" size="xs" />
      </SimpleGrid>

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
          <IconPlus size={28} stroke={2.5} />
        </ActionIcon>
      </Affix>

      <TransactionDrawer
        opened={txDrawerOpen}
        onClose={() => setTxDrawerOpen(false)}
        anchorDate={settings.anchorDate}
        today={today}
        target={liveDrawerTarget}
      />

      <ReconcileDrawer
        opened={reconcileOpen}
        onClose={() => setReconcileOpen(false)}
        currentBalance={currentBalance}
      />

      <RulesDrawer opened={rulesOpen} onClose={() => setRulesOpen(false)} rules={rules} />

      <MonthlySummaryDrawer
        opened={monthlySummaryOpen}
        onClose={() => setMonthlySummaryOpen(false)}
        rows={forecast}
        anchorDate={settings.anchorDate}
        threshold={settings.threshold}
      />

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

type ThresholdFormValues = {
  threshold: number | string
}

function ThresholdForm({
  currentThreshold,
  onClose,
}: {
  currentThreshold: number
  onClose: () => void
}) {
  const setThreshold = useMutation(api.settings.setThreshold)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ThresholdFormValues>({
    initialValues: { threshold: currentThreshold },
    validate: {
      threshold: (value) => (typeof value !== 'number' ? 'しきい値を入力してください' : null),
    },
  })

  const handleSubmit = async (values: ThresholdFormValues) => {
    if (typeof values.threshold !== 'number') return
    setSubmitting(true)
    try {
      await setThreshold({ threshold: Math.round(values.threshold) })
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, 'しきい値の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          残高がこの金額を下回る行を強調表示します。
        </Text>

        <NumberInput
          label="しきい値"
          thousandSeparator=","
          hideControls
          min={0}
          max={1_000_000_000}
          prefix="¥"
          inputMode="numeric"
          disabled={submitting}
          {...form.getInputProps('threshold')}
        />

        <Button type="submit" loading={submitting} disabled={submitting}>
          保存
        </Button>
      </Stack>
    </form>
  )
}
