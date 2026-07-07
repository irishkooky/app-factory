import { Stack, Title } from '@app-factory/ui'

export const Orders = () => (
  <Stack gap="xs">
    <Title order={1}>見出し1: サービス概要</Title>
    <Title order={2}>見出し2: 料金プラン</Title>
    <Title order={3}>見出し3: よくある質問</Title>
    <Title order={4}>見出し4: 補足事項</Title>
  </Stack>
)

export const Colored = () => (
  <Stack gap="xs">
    <Title order={2} c="indigo.6">
      indigo系の見出し
    </Title>
    <Title order={2} c="red.6">
      注意喚起の見出し
    </Title>
    <Title order={2} c="dimmed">
      控えめな見出し
    </Title>
  </Stack>
)

export const Aligned = () => (
  <Stack gap="xs" w={360}>
    <Title order={3} ta="left">
      左寄せ見出し
    </Title>
    <Title order={3} ta="center">
      中央寄せ見出し
    </Title>
    <Title order={3} ta="right">
      右寄せ見出し
    </Title>
  </Stack>
)
