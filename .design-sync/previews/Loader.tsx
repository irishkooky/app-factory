import { Group, Loader, Stack, Text } from '@app-factory/ui'

export const Types = () => (
  <Group gap="xl" align="center">
    <Stack align="center" gap={4}>
      <Loader type="oval" />
      <Text size="xs" c="dimmed">oval</Text>
    </Stack>
    <Stack align="center" gap={4}>
      <Loader type="bars" />
      <Text size="xs" c="dimmed">bars</Text>
    </Stack>
    <Stack align="center" gap={4}>
      <Loader type="dots" />
      <Text size="xs" c="dimmed">dots</Text>
    </Stack>
  </Group>
)

export const Sizes = () => (
  <Group gap="lg" align="center">
    <Loader size="xs" />
    <Loader size="sm" />
    <Loader size="md" />
    <Loader size="lg" />
    <Loader size="xl" />
  </Group>
)

export const Colors = () => (
  <Group gap="lg" align="center">
    <Loader color="indigo" />
    <Loader color="teal" />
    <Loader color="red" />
    <Loader color="gray" />
  </Group>
)

export const InlineWithText = () => (
  <Group gap="xs" align="center">
    <Loader size="sm" />
    <Text size="sm">データを読み込んでいます…</Text>
  </Group>
)
