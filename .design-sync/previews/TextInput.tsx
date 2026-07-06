import { Stack, TextInput } from '@app-factory/ui'

export const Basic = () => (
  <TextInput label="ユーザー名" placeholder="yamada_taro" maw={320} />
)

export const WithDescription = () => (
  <TextInput
    label="メールアドレス"
    description="確認メールを送信します"
    placeholder="you@example.com"
    withAsterisk
    maw={320}
  />
)

export const ErrorState = () => (
  <TextInput
    label="表示名"
    defaultValue="a"
    error="2文字以上で入力してください"
    maw={320}
  />
)

export const DisabledAndSizes = () => (
  <Stack gap="sm" maw={320}>
    <TextInput label="無効な入力" placeholder="編集できません" disabled />
    <TextInput size="xs" placeholder="サイズ xs" />
    <TextInput size="lg" placeholder="サイズ lg" />
  </Stack>
)
