import { Badge, Group, Paper, Stack, Text, Title } from '@app-factory/ui'

export const Basic = () => (
  <Paper withBorder radius="md" p="lg" maw={320}>
    <Stack gap="xs">
      <Title order={4}>会員プラン</Title>
      <Text size="sm" c="dimmed">スタンダードプラン・月額980円</Text>
    </Stack>
  </Paper>
)

export const ShadowSweep = () => (
  <Group align="flex-start">
    <Paper shadow="xs" p="md" w={140}>
      <Text size="xs" ta="center">shadow="xs"</Text>
    </Paper>
    <Paper shadow="md" p="md" w={140}>
      <Text size="xs" ta="center">shadow="md"</Text>
    </Paper>
    <Paper shadow="xl" p="md" w={140}>
      <Text size="xs" ta="center">shadow="xl"</Text>
    </Paper>
  </Group>
)

export const RadiusAndBorder = () => (
  <Group align="flex-start">
    <Paper withBorder radius={0} p="md" w={140}>
      <Text size="xs" ta="center">radius=0</Text>
    </Paper>
    <Paper withBorder radius="lg" p="md" w={140}>
      <Text size="xs" ta="center">radius="lg"</Text>
    </Paper>
  </Group>
)

export const NotificationCard = () => (
  <Paper withBorder radius="md" p="md" maw={320}>
    <Group justify="space-between" mb={4}>
      <Text fw={600} size="sm">在庫アラート</Text>
      <Badge color="red" variant="light">要対応</Badge>
    </Group>
    <Text size="xs" c="dimmed">「indigo マグカップ」の在庫が残り3個です。</Text>
  </Paper>
)
