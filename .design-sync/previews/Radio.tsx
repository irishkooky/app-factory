import { Stack, Radio } from '@app-factory/ui'

export const GroupBasic = () => (
  <Radio.Group
    label="配送方法"
    defaultValue="standard"
    maw={320}
  >
    <Stack gap="xs" mt="xs">
      <Radio value="standard" label="通常配送（3〜5日）" />
      <Radio value="express" label="お急ぎ便（翌日）" />
      <Radio value="pickup" label="店頭受け取り" />
    </Stack>
  </Radio.Group>
)

export const WithDescription = () => (
  <Radio.Group
    label="請求書の宛名"
    description="法人の場合は会社名でお願いします"
    defaultValue="personal"
    maw={320}
  >
    <Stack gap="xs" mt="xs">
      <Radio value="personal" label="個人名" />
      <Radio value="company" label="会社名" />
    </Stack>
  </Radio.Group>
)

export const ErrorState = () => (
  <Radio.Group
    label="性別"
    withAsterisk
    error="選択してください"
    maw={320}
  >
    <Stack gap="xs" mt="xs">
      <Radio value="male" label="男性" />
      <Radio value="female" label="女性" />
      <Radio value="other" label="回答しない" />
    </Stack>
  </Radio.Group>
)

export const Disabled = () => (
  <Radio.Group label="プラン変更（審査中のため変更不可）" defaultValue="pro" disabled maw={320}>
    <Stack gap="xs" mt="xs">
      <Radio value="free" label="フリー" />
      <Radio value="pro" label="プロ" />
    </Stack>
  </Radio.Group>
)
