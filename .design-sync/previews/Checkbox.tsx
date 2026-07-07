import { Stack, Checkbox } from '@app-factory/ui'

export const Basic = () => (
  <Stack gap="sm" maw={280}>
    <Checkbox label="利用規約に同意する" defaultChecked />
    <Checkbox label="メールマガジンを受け取る" />
  </Stack>
)

export const WithDescription = () => (
  <Checkbox
    label="自動更新を有効にする"
    description="毎月1日に自動で課金されます"
    defaultChecked
    maw={320}
  />
)

export const Group = () => (
  <Checkbox.Group
    label="通知を受け取る項目"
    description="複数選択できます"
    defaultValue={['order', 'campaign']}
    maw={320}
  >
    <Stack gap="xs" mt="xs">
      <Checkbox value="order" label="注文状況の更新" />
      <Checkbox value="campaign" label="キャンペーン情報" />
      <Checkbox value="news" label="サービスからのお知らせ" />
    </Stack>
  </Checkbox.Group>
)

export const IndeterminateAndError = () => (
  <Stack gap="sm" maw={320}>
    <Checkbox label="すべて選択" indeterminate />
    <Checkbox
      label="プライバシーポリシーに同意する"
      error="同意が必要です"
    />
  </Stack>
)

export const Disabled = () => (
  <Stack gap="sm" maw={320}>
    <Checkbox label="管理者権限（編集不可）" defaultChecked disabled />
    <Checkbox label="無効な項目" disabled />
  </Stack>
)
