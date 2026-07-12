// アプリ非依存の課金UI。新規アプリにはこのままコピーする（docs/billing.md 参照）。
//
// convex/billing.ts が返すプラン情報をそのまま表示・操作するだけのコンポーネント群。
// プラン制限（何を何件まで、等）はここには書かない。アプリ固有の組み込み側で判断する。
import { useState, type ReactNode } from 'react'
import { Button, Chip } from '@heroui/react'
import type { ButtonProps } from '@heroui/react'
import { useAction, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { api } from '../../convex/_generated/api'

type Plan = 'free' | 'pro'

type PlanState = {
  isLoading: boolean
  plan: Plan | null
  status: string | null
  currentPeriodEnd: number | null
}

/** convex/billing.ts の getPlan query の薄いラッパー。 */
export function usePlan(): PlanState {
  const data = useQuery(api.billing.getPlan)
  if (data === undefined) {
    return { isLoading: true, plan: null, status: null, currentPeriodEnd: null }
  }
  if (data === null) {
    return { isLoading: false, plan: null, status: null, currentPeriodEnd: null }
  }
  return { isLoading: false, plan: data.plan, status: data.status, currentPeriodEnd: data.currentPeriodEnd }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) {
    const data: unknown = err.data
    if (typeof data === 'string' && data.length > 0) return data
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }
  if (err instanceof Error && err.message.length > 0) return err.message
  return fallback
}

export function PlanBadge() {
  const { isLoading, plan } = usePlan()
  if (isLoading || plan === null) return null
  if (plan === 'pro') return (
    <Chip color="accent" size="sm">
      Pro
    </Chip>
  )
  return (
    <Chip variant="soft" size="sm">
      Free
    </Chip>
  )
}

type ActionButtonProps = Omit<ButtonProps, 'onPress' | 'isPending'> & {
  label?: string
}

export function UpgradeButton({ label = 'Proにアップグレード', ...buttonProps }: ActionButtonProps) {
  const createCheckoutSession = useAction(api.billing.createCheckoutSession)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePress = async () => {
    setError(null)
    setLoading(true)
    try {
      const url = await createCheckoutSession({})
      window.location.href = url
    } catch (err) {
      setError(extractErrorMessage(err, 'アップグレードに失敗しました'))
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onPress={handlePress} isPending={loading} isDisabled={loading} {...buttonProps}>
        {label}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function ManageBillingButton({ label = 'サブスク管理', ...buttonProps }: ActionButtonProps) {
  const createPortalSession = useAction(api.billing.createPortalSession)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePress = async () => {
    setError(null)
    setLoading(true)
    try {
      const url = await createPortalSession({})
      window.location.href = url
    } catch (err) {
      setError(extractErrorMessage(err, 'サブスク管理画面を開けませんでした'))
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onPress={handlePress} isPending={loading} isDisabled={loading} {...buttonProps}>
        {label}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

/** plan に応じてUpgradeButton/ManageBillingButtonを出し分ける。ローディング中はdisabledのButton。 */
export function BillingButton(buttonProps: Omit<ButtonProps, 'onPress' | 'isPending'>) {
  const { isLoading, plan } = usePlan()

  if (isLoading || plan === null) {
    return (
      <Button isDisabled {...buttonProps}>
        プラン
      </Button>
    )
  }

  if (plan === 'pro') {
    return <ManageBillingButton {...buttonProps} />
  }

  return <UpgradeButton label="Proにアップグレード" {...buttonProps} />
}

type ProGateProps = {
  title: string
  description: string
  children: ReactNode
}

/** pro なら children をそのまま表示、free ならアップグレード導線を表示する。 */
export function ProGate({ title, description, children }: ProGateProps) {
  const { isLoading, plan } = usePlan()

  // ちらつき防止のため、ロード中はchildrenを一瞬でも出さない。
  if (isLoading) return null

  if (plan === 'pro') {
    return <>{children}</>
  }

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <h5 className="text-sm font-semibold">{title}</h5>
        <p className="text-sm text-muted">{description}</p>
        <UpgradeButton size="sm" />
      </div>
    </div>
  )
}
