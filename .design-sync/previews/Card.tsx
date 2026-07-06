import { Badge, Button, Card, Group, Stack, Text, Title } from '@app-factory/ui'

export const Basic = () => (
  <Card withBorder radius="md" padding="lg" maw={360}>
    <Stack gap="sm">
      <Title order={3}>技術スタック</Title>
      <Text size="sm">TanStack Start（React 19）</Text>
      <Text size="sm">Mantine v9（UIコンポーネント）</Text>
      <Text size="sm">Cloudflare Workers にデプロイ</Text>
    </Stack>
  </Card>
)

export const WithSection = () => (
  <Card withBorder radius="md" maw={360}>
    <Card.Section bg="indigo.6" c="white" p="md">
      <Text fw={700}>今週の天気</Text>
    </Card.Section>
    <Stack gap="xs" mt="md">
      <Group justify="space-between">
        <Text>東京</Text>
        <Badge color="teal">晴れ</Badge>
      </Group>
      <Text c="dimmed" size="sm">
        最高 28°C / 最低 21°C・降水確率 10%
      </Text>
      <Button variant="light" fullWidth mt="sm">
        詳細を見る
      </Button>
    </Stack>
  </Card>
)

export const Shadowed = () => (
  <Card shadow="md" radius="md" padding="xl" maw={360}>
    <Stack gap="sm">
      <Title order={4}>アプリを量産しよう</Title>
      <Text size="sm" c="dimmed">
        app factory は小さなWebアプリを次々とデプロイするためのモノレポです。
      </Text>
    </Stack>
  </Card>
)
