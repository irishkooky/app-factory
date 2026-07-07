import { Paper, Stack, Text, Title } from '@app-factory/ui'

export const Basic = () => (
  <Stack gap="md" maw={320}>
    <Paper withBorder p="sm">
      <Text size="sm">氏名を入力してください</Text>
    </Paper>
    <Paper withBorder p="sm">
      <Text size="sm">メールアドレスを入力してください</Text>
    </Paper>
    <Paper withBorder p="sm">
      <Text size="sm">パスワードを入力してください</Text>
    </Paper>
  </Stack>
)

export const GapSweep = () => (
  <Stack gap={0} maw={320}>
    <Title order={5}>gap比較</Title>
    <Stack gap="xs">
      <Paper withBorder p="xs"><Text size="xs">xs</Text></Paper>
      <Paper withBorder p="xs"><Text size="xs">xs</Text></Paper>
    </Stack>
    <Stack gap="xl" mt="md">
      <Paper withBorder p="xs"><Text size="xs">xl</Text></Paper>
      <Paper withBorder p="xs"><Text size="xs">xl</Text></Paper>
    </Stack>
  </Stack>
)

export const AlignedCenter = () => (
  <Stack align="center" gap="sm" maw={320}>
    <Title order={4}>本日の売上</Title>
    <Text size="xl" fw={700}>¥128,400</Text>
    <Text size="sm" c="dimmed">前日比 +12%</Text>
  </Stack>
)
