import { Group, Stack, Text, ThemeIcon } from '@app-factory/ui'

export const Variants = () => (
  <Group>
    <ThemeIcon variant="filled">★</ThemeIcon>
    <ThemeIcon variant="light">★</ThemeIcon>
    <ThemeIcon variant="outline">★</ThemeIcon>
    <ThemeIcon variant="default">★</ThemeIcon>
    <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
      ★
    </ThemeIcon>
  </Group>
)

export const Colors = () => (
  <Group>
    <ThemeIcon color="indigo">✓</ThemeIcon>
    <ThemeIcon color="teal">✓</ThemeIcon>
    <ThemeIcon color="red">!</ThemeIcon>
    <ThemeIcon color="yellow">!</ThemeIcon>
  </Group>
)

export const Sizes = () => (
  <Group align="center">
    <ThemeIcon size="xs">★</ThemeIcon>
    <ThemeIcon size="sm">★</ThemeIcon>
    <ThemeIcon size="md">★</ThemeIcon>
    <ThemeIcon size="lg">★</ThemeIcon>
    <ThemeIcon size="xl">★</ThemeIcon>
  </Group>
)

export const InContext = () => (
  <Stack gap="xs">
    <Group gap="sm">
      <ThemeIcon color="teal" radius="xl">
        ✓
      </ThemeIcon>
      <Text size="sm">お支払いが完了しました</Text>
    </Group>
    <Group gap="sm">
      <ThemeIcon color="red" radius="xl">
        !
      </ThemeIcon>
      <Text size="sm">カード情報の確認が必要です</Text>
    </Group>
  </Stack>
)
