import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Drawer, FieldError, Label, NumberField, Spinner } from '@heroui/react'
import { IconMenu2, IconPlus } from '@tabler/icons-react'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { addMonthsToDateClamped, formatDateShort, todayJST } from '../lib/date'
import { buildForecast, type ForecastRow } from '../lib/forecast'
import { buildBalanceSeries } from '../lib/chart'
import { formatYen } from '../lib/money'
import { notifyError, notifyQueue, notifySaved } from '../lib/notify'
import { OnboardingView } from '../components/OnboardingView'
import { ForecastList } from '../components/ForecastList'
import { TransactionDrawer } from '../components/TransactionDrawer'
import { ReconcileDrawer } from '../components/ReconcileDrawer'
import { RulesDrawer } from '../components/RulesDrawer'
import { MonthlySummaryDrawer } from '../components/MonthlySummaryDrawer'
import { BalanceChart } from '../components/BalanceChart'
import { MenuDrawer } from '../components/MenuDrawer'
import { PlanBadge, ProGate } from '../components/BillingControls'

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
      notifyQueue.add({
        title: '決済を受け付けました',
        description: 'プランへの反映まで数秒かかることがあります。',
        variant: 'success',
      }, { timeout: 8000 })
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
    <div className="mx-auto max-w-sm px-4 py-4">
      <div className="flex flex-col gap-6">
        <AuthLoading>
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </AuthLoading>

        <Unauthenticated>
          <UnauthenticatedView />
        </Unauthenticated>

        <Authenticated>
          <AuthenticatedView />
        </Authenticated>
      </div>
    </div>
  )
}

function UnauthenticatedView() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">残高予測</h1>
      <p className="text-muted">基準残高と毎月の予定から、これから12ヶ月の残高推移を予測します。</p>
      <SignInButton mode="modal">
        <Button size="lg">Googleでログイン</Button>
      </SignInButton>
    </div>
  )
}

function AuthenticatedView() {
  const settings = useQuery(api.settings.get)

  if (settings === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
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
  const [menuOpen, setMenuOpen] = useState(false)

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
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">残高予測</h4>
        <div className="flex items-center gap-2">
          <PlanBadge />
          <UserButton />
          <Button isIconOnly variant="tertiary" aria-label="メニュー" onPress={() => setMenuOpen(true)}>
            <IconMenu2 size={20} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className={`text-4xl font-bold tabular-nums ${currentBalance < 0 ? 'text-red-600' : ''}`}>
          {formatYen(currentBalance)}
        </span>
        <span className={`text-sm tabular-nums ${belowThresholdNow ? 'text-warning' : 'text-muted'}`}>
          今後12ヶ月の最低残高 {formatYen(minBalance)}（{formatDateShort(minDate)}）
        </span>
      </div>

      <ProGate title="残高推移グラフ" description="グラフ表示はProプラン限定です">
        <BalanceChart points={balancePoints} threshold={settings.threshold} today={today} />
      </ProGate>

      <ForecastList
        rows={forecast}
        today={today}
        onRowClick={(row) => {
          setTxDrawerTarget(row)
          setTxDrawerOpen(true)
        }}
      />

      <Button
        isIconOnly
        size="lg"
        aria-label="取引を追加"
        className="fixed right-6 bottom-6 rounded-full shadow-lg"
        onPress={() => {
          setTxDrawerTarget(null)
          setTxDrawerOpen(true)
        }}
      >
        <IconPlus size={28} stroke={2.5} />
      </Button>

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

      <MenuDrawer
        opened={menuOpen}
        onClose={() => setMenuOpen(false)}
        onReconcile={() => { setMenuOpen(false); setReconcileOpen(true) }}
        onRules={() => { setMenuOpen(false); setRulesOpen(true) }}
        onThreshold={() => { setMenuOpen(false); setThresholdOpen(true) }}
        onMonthlySummary={() => { setMenuOpen(false); setMonthlySummaryOpen(true) }}
      />
    </div>
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
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>しきい値</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && <ThresholdForm currentThreshold={currentThreshold} onClose={onClose} />}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
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
  const [submitting, setSubmitting] = useState(false)
  const [threshold, setThresholdValue] = useState<number | undefined>(currentThreshold)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (threshold === undefined) {
      setError('しきい値を入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await setThreshold({ threshold: Math.round(threshold) })
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, 'しきい値の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">残高がこの金額を下回る行を強調表示します。</p>

      <NumberField
        isInvalid={error !== null}
        isDisabled={submitting}
        minValue={0}
        maxValue={1_000_000_000}
        value={threshold}
        onChange={setThresholdValue}
        formatOptions={{ style: 'currency', currency: 'JPY' }}
      >
        <Label>しきい値</Label>
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
    </form>
  )
}
