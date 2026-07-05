import { Card, SimpleGrid, Stack, Text, Title } from '@mantine/core'

interface ExampleInfo {
  title: string
  description: string
}

const EXAMPLES: ExampleInfo[] = [
  {
    title: 'テストが通るまで直すループ',
    description: 'CIの失敗ログを読んで修正→テスト→繰り返し。人は結果だけレビュー',
  },
  {
    title: 'PRの番人ループ',
    description:
      'レビューコメントやCI失敗のイベントを待ち受けて、来るたびに対応してpush。マージされるまで続く',
  },
  {
    title: '定期実行ループ',
    description: 'cronで毎朝起動し、依存更新やIssueトリアージなど決まった仕事を回す。人は例外だけ通知を受け取る',
  },
]

export function ExamplesSection() {
  return (
    <Stack gap="md">
      <Title order={2}>現実のループの例</Title>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {EXAMPLES.map((example) => (
          <Card key={example.title} withBorder radius="md" padding="lg">
            <Stack gap="xs">
              <Title order={4}>{example.title}</Title>
              <Text size="sm">{example.description}</Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
      <Text c="dimmed">
        共通点: 人間は“毎回の指示”ではなく、“ゴールと止まり方”だけを最初に設計している。
      </Text>
    </Stack>
  )
}
