import { AppShell, Card, Group, Stack, Text, Title } from '@app-factory/ui'

export const MiniApp = () => (
  <AppShell header={{ height: 56 }} navbar={{ width: 240, breakpoint: 'sm' }} padding="md">
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between">
        <Title order={4}>app factory</Title>
        <Text size="sm" c="dimmed">ダッシュボード</Text>
      </Group>
    </AppShell.Header>
    <AppShell.Navbar p="md">
      <Stack gap="xs">
        <Text size="sm" fw={600}>ホーム</Text>
        <Text size="sm" c="dimmed">注文管理</Text>
        <Text size="sm" c="dimmed">在庫管理</Text>
        <Text size="sm" c="dimmed">売上レポート</Text>
        <Text size="sm" c="dimmed">設定</Text>
      </Stack>
    </AppShell.Navbar>
    <AppShell.Main>
      <Title order={3} mb="md">概要</Title>
      <Group align="flex-start">
        <Card withBorder radius="md" padding="md" w={220}>
          <Text size="sm" c="dimmed">本日の売上</Text>
          <Title order={3}>¥182,300</Title>
        </Card>
        <Card withBorder radius="md" padding="md" w={220}>
          <Text size="sm" c="dimmed">新規注文</Text>
          <Title order={3}>24件</Title>
        </Card>
      </Group>
    </AppShell.Main>
  </AppShell>
)
