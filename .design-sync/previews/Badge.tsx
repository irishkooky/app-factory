import { Badge, Group, Stack } from '@app-factory/ui'

export const Variants = () => (
  <Group gap="sm">
    <Badge variant="filled" color="indigo">在庫あり</Badge>
    <Badge variant="light" color="indigo">在庫あり</Badge>
    <Badge variant="outline" color="indigo">在庫あり</Badge>
    <Badge variant="dot" color="indigo">在庫あり</Badge>
    <Badge variant="gradient" gradient={{ from: 'indigo', to: 'grape' }}>在庫あり</Badge>
  </Group>
)

export const Colors = () => (
  <Group gap="sm">
    <Badge color="teal">完了</Badge>
    <Badge color="yellow">保留中</Badge>
    <Badge color="red">キャンセル</Badge>
    <Badge color="gray">下書き</Badge>
  </Group>
)

export const Sizes = () => (
  <Group gap="sm" align="center">
    <Badge size="xs">XS</Badge>
    <Badge size="sm">小</Badge>
    <Badge size="md">中</Badge>
    <Badge size="lg">大</Badge>
    <Badge size="xl">特大</Badge>
  </Group>
)

export const CircleAndFullWidth = () => (
  <Stack gap="sm" maw={320}>
    <Group gap="sm" align="center">
      <Badge circle size="lg">3</Badge>
      <Badge circle size="lg" color="red">9+</Badge>
    </Group>
    <Badge fullWidth color="indigo" variant="light">送料無料キャンペーン中</Badge>
  </Stack>
)
