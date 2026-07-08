import { Group, Pagination, Stack, Text } from '@app-factory/ui'

export const Basic = () => (
  <Stack gap="xs">
    <Text size="sm" c="dimmed">
      デプロイ履歴（全128件・1ページ20件）
    </Text>
    <Pagination total={7} defaultValue={3} />
  </Stack>
)

export const WithEdges = () => <Pagination total={12} defaultValue={5} withEdges />

export const Sizes = () => (
  <Group align="center">
    <Pagination total={5} defaultValue={2} size="xs" />
    <Pagination total={5} defaultValue={2} size="md" />
    <Pagination total={5} defaultValue={2} size="xl" />
  </Group>
)

export const Disabled = () => <Pagination total={9} defaultValue={1} disabled />
