import { Progress, Stack, Text } from '@app-factory/ui'

export const Basic = () => (
  <Stack gap="xs" maw={320}>
    <Text size="sm">アップロード進捗 65%</Text>
    <Progress value={65} size="lg" />
  </Stack>
)

export const Colors = () => (
  <Stack gap="md" maw={320}>
    <Stack gap={4}>
      <Text size="sm">ストレージ使用量 30%</Text>
      <Progress value={30} color="teal" size="md" />
    </Stack>
    <Stack gap={4}>
      <Text size="sm">容量残りわずか 80%</Text>
      <Progress value={80} color="yellow" size="md" />
    </Stack>
    <Stack gap={4}>
      <Text size="sm">上限超過 95%</Text>
      <Progress value={95} color="red" size="md" />
    </Stack>
  </Stack>
)

export const StripedAnimated = () => (
  <Stack gap="xs" maw={320}>
    <Text size="sm">動画を変換中…</Text>
    <Progress value={45} size="lg" striped animated color="indigo" />
  </Stack>
)

export const MultiSection = () => (
  <Stack gap="xs" maw={320}>
    <Text size="sm">ディスク使用内訳（合計 78%）</Text>
    <Progress.Root size="xl">
      <Progress.Section value={40} color="indigo">
        <Progress.Label>写真</Progress.Label>
      </Progress.Section>
      <Progress.Section value={25} color="teal">
        <Progress.Label>動画</Progress.Label>
      </Progress.Section>
      <Progress.Section value={13} color="gray">
        <Progress.Label>その他</Progress.Label>
      </Progress.Section>
    </Progress.Root>
  </Stack>
)
