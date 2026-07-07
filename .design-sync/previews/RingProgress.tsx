import { Group, RingProgress, Stack, Text } from '@app-factory/ui'

export const SingleSection = () => (
  <RingProgress
    size={140}
    thickness={12}
    sections={[{ value: 72, color: 'indigo' }]}
    label={
      <Text size="lg" fw={700} ta="center">
        72%
      </Text>
    }
  />
)

export const MultiSection = () => (
  <RingProgress
    size={160}
    thickness={16}
    roundCaps
    sections={[
      { value: 40, color: 'indigo', tooltip: 'デスクトップ 40%' },
      { value: 30, color: 'teal', tooltip: 'モバイル 30%' },
      { value: 15, color: 'yellow', tooltip: 'タブレット 15%' },
    ]}
    label={
      <Text size="sm" fw={600} ta="center">
        訪問元
        <br />
        内訳
      </Text>
    }
  />
)

export const Sizes = () => (
  <Group align="center" gap="lg">
    <RingProgress
      size={80}
      thickness={8}
      sections={[{ value: 55, color: 'indigo' }]}
      label={
        <Text size="xs" fw={700} ta="center">
          55%
        </Text>
      }
    />
    <RingProgress
      size={120}
      thickness={12}
      sections={[{ value: 55, color: 'indigo' }]}
      label={
        <Text size="md" fw={700} ta="center">
          55%
        </Text>
      }
    />
    <RingProgress
      size={160}
      thickness={16}
      sections={[{ value: 55, color: 'indigo' }]}
      label={
        <Text size="xl" fw={700} ta="center">
          55%
        </Text>
      }
    />
  </Group>
)

export const CompletionCard = () => (
  <Stack align="center" gap="xs" maw={220}>
    <RingProgress
      size={130}
      thickness={14}
      sections={[{ value: 100, color: 'teal' }]}
      label={
        <Text size="xl" ta="center">
          ✓
        </Text>
      }
    />
    <Text size="sm" c="dimmed">
      全タスク完了
    </Text>
  </Stack>
)
