import { createFileRoute, Link } from '@tanstack/react-router'
import { Anchor, Container, List, Paper, Stack, Text, Title } from '@mantine/core'

export const Route = createFileRoute('/rules')({
  component: RulesComponent,
})

function RulesComponent() {
  return (
    <Container size="sm" px="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>遊び方</Title>

        <Text>
          スマホ1台をテーブルの真ん中で回して遊ぶ、飲み会パーティーゲームです。
          「次に誰がやるか」を、いちばん小さい主役——赤ちゃんが決めます。
        </Text>

        <Paper withBorder radius="lg" p="md">
          <Stack gap="xs">
            <Title order={3}>🎤 お題トーク</Title>
            <Text size="sm" c="dimmed">
              赤ちゃんが選んだ人が、表示されたお題に答えます。
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder radius="lg" p="md">
          <Stack gap="xs">
            <Title order={3}>🔥 ミッション</Title>
            <Text size="sm" c="dimmed">
              赤ちゃんが選んだ人が、その場でミッションを実行します。
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder radius="lg" p="md">
          <Stack gap="xs">
            <Title order={3}>👉 せーの！指さし</Title>
            <Text size="sm" c="dimmed">
              お題が読み上げられたら、全員で一斉に「これだ」と思う人を指さします。
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder radius="lg" p="md">
          <Stack gap="xs">
            <Title order={3}>🔮 赤ちゃん占い</Title>
            <Text size="sm" c="dimmed">
              赤ちゃんが選んだ人の、今日の運勢を占います。
            </Text>
          </Stack>
        </Paper>

        <Stack gap="xs">
          <Title order={3}>赤ちゃんの参加方法</Title>
          <Text size="sm" c="dimmed">
            スマホを赤ちゃんの前に置くと、画面いっぱいに色とりどりのマルが揺れて表示されます。
            赤ちゃんが最初に触ったマルの持ち主が選ばれます。赤ちゃんが眠ってしまっている場合は
            「赤ちゃんに選んでもらう」をOFFにすれば、アプリが自動で選びます。
          </Text>
        </Stack>

        <Paper withBorder radius="lg" p="md" bg="dark.6">
          <Stack gap={4}>
            <Title order={4}>注意事項</Title>
            <List size="sm" c="dimmed" spacing={4}>
              <List.Item>スマホは清潔な状態で使ってください</List.Item>
              <List.Item>赤ちゃんが口に入れないよう、必ず大人が見守ってください</List.Item>
              <List.Item>スマホのケースを外しておくと、あとで拭きやすくなります</List.Item>
            </List>
          </Stack>
        </Paper>

        <Anchor component={Link} to="/" size="sm">
          ← もどる
        </Anchor>
      </Stack>
    </Container>
  )
}
