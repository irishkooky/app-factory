import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'

interface PartInfo {
  title: string
  summary: string
  example: string
}

const PARTS: PartInfo[] = [
  {
    title: 'ゴール',
    summary: '何をもって「完了」か。曖昧だとループは迷走する',
    example: '「全テストが通る」「CIがグリーン」',
  },
  {
    title: '行動（Act）',
    summary: 'エージェントが1回の反復でやること',
    example: 'コードを読む・修正する・コマンドを実行する',
  },
  {
    title: '検証器（Verify）',
    summary: '結果を客観的に測る仕組み。ループの心臓部',
    example: 'テストスイート、型チェック、lint、E2E',
  },
  {
    title: '停止条件（Stop）',
    summary: 'いつ止まるか。自己申告に頼らない',
    example: '「検証が通ったら」「予算を使い切ったら」',
  },
  {
    title: '予算',
    summary: '暴走防止の上限',
    example: '最大反復回数、トークン/コスト上限、時間制限',
  },
]

export function PartsSection() {
  return (
    <Stack gap="md">
      <Title order={2}>ループを構成する5つの部品</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {PARTS.map((part, index) => (
          <Card key={part.title} withBorder radius="md" padding="lg">
            <Stack gap="xs">
              <Group gap="xs">
                <Badge circle variant="filled">
                  {index + 1}
                </Badge>
                <Title order={4}>{part.title}</Title>
              </Group>
              <Text>{part.summary}</Text>
              <Text size="sm" c="dimmed">
                例: {part.example}
              </Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
