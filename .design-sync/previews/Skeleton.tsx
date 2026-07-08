import { Card, Group, Skeleton, Stack } from '@app-factory/ui'

export const TextLines = () => (
  <Stack gap="sm" maw={320}>
    <Skeleton height={12} width="70%" radius="sm" />
    <Skeleton height={12} width="90%" radius="sm" />
    <Skeleton height={12} width="50%" radius="sm" />
  </Stack>
)

export const ProfileCard = () => (
  <Card withBorder radius="md" padding="lg" maw={320}>
    <Group>
      <Skeleton height={48} width={48} circle />
      <Stack gap={6} style={{ flex: 1 }}>
        <Skeleton height={10} width="60%" radius="sm" />
        <Skeleton height={10} width="40%" radius="sm" />
      </Stack>
    </Group>
    <Stack gap={6} mt="md">
      <Skeleton height={10} radius="sm" />
      <Skeleton height={10} width="80%" radius="sm" />
    </Stack>
  </Card>
)

export const ImagePlaceholder = () => (
  <Stack gap="sm" maw={320}>
    <Skeleton height={140} radius="md" />
    <Skeleton height={12} width="85%" radius="sm" />
    <Skeleton height={12} width="55%" radius="sm" />
  </Stack>
)

export const VisibleToggle = () => (
  <Stack gap="sm" maw={320}>
    <Skeleton height={60} radius="md" visible />
    <Skeleton height={60} radius="md" visible={false}>
      <Card withBorder radius="md" padding="sm">
        読み込み完了後のコンテンツ
      </Card>
    </Skeleton>
  </Stack>
)
