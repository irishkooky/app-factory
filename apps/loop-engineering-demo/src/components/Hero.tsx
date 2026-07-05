import { Badge, Card, Stack, Text, Title } from '@mantine/core'

export function Hero() {
  return (
    <Stack gap="md">
      <Badge variant="light" size="lg" w="fit-content">
        2026年のAIトレンド
      </Badge>

      <Stack gap={4}>
        <Title order={1}>ループエンジニアリング</Title>
        <Text size="lg" c="dimmed">
          Loop Engineering — プロンプトを打つ時代から、ループを設計する時代へ
        </Text>
      </Stack>

      <Text size="lg">
        AIへの1回の指示（プロンプト）を磨き込むのではなく、AIエージェントが〈行動 →
        観察 → 判定〉を自動で繰り返す“ループ”そのものを設計するアプローチ。人間の仕事は
        『毎回指示を出すこと』から『ゴール・検証方法・止まり方を決めること』に変わる。
      </Text>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs">
          <Text size="lg" fs="italic">
            “I don't prompt Claude anymore. I have loops that are running. They're the
            ones that are prompting Claude and figuring out what to do.”
          </Text>
          <Text size="sm">
            「私はもうClaudeにプロンプトを打っていない。走り続けるループたちがある。Claudeに指示を出し、次に何をすべきか決めているのは、そのループのほうだ。」
          </Text>
          <Text size="sm" c="dimmed">
            — Boris Cherny（Claude Code の作者, Anthropic）, 2026年6月
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}
