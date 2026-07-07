import { Stack, Switch } from '@app-factory/ui'

export const OnOff = () => (
  <Stack gap="sm" maw={280}>
    <Switch label="通知を有効にする" defaultChecked />
    <Switch label="ダークモード" />
  </Stack>
)

export const WithInnerLabels = () => (
  <Stack gap="sm" maw={280}>
    <Switch label="公開設定" onLabel="ON" offLabel="OFF" defaultChecked size="lg" />
    <Switch label="メンテナンスモード" onLabel="ON" offLabel="OFF" size="lg" />
  </Stack>
)

export const WithDescription = () => (
  <Switch
    label="自動バックアップ"
    description="毎日午前3時に実行されます"
    defaultChecked
    maw={320}
  />
)

export const ErrorState = () => (
  <Switch
    label="利用規約に同意する"
    error="オンにしてください"
    maw={320}
  />
)

export const Disabled = () => (
  <Stack gap="sm" maw={280}>
    <Switch label="課金機能（承認待ち）" defaultChecked disabled />
    <Switch label="ベータ機能" disabled />
  </Stack>
)
