import { AppProvider, Badge, Button, Card, Group, Stack, Text, Title } from '@app-factory/ui'

// AppProvider is the root theme wrapper. The preview harness already wraps
// every cell in it, but this component's whole purpose is showing "this is
// the root wrapper" — so we nest it again here on purpose to render visible
// themed content inside.
export const RootWrapper = () => (
  <AppProvider>
    <Card withBorder radius="md" padding="lg" maw={360}>
      <Stack gap="sm">
        <Title order={3}>店舗ダッシュボード</Title>
        <Text size="sm" c="dimmed">
          AppProvider が indigo テーマとフォントをアプリ全体に適用します。
        </Text>
        <Button>ログインする</Button>
      </Stack>
    </Card>
  </AppProvider>
)

export const ThemedContent = () => (
  <AppProvider>
    <Card withBorder radius="md" padding="lg" maw={360}>
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>注文 #10234</Title>
          <Badge color="indigo">処理中</Badge>
        </Group>
        <Text size="sm">
          indigo をプライマリカラーとする共通テーマが、Card・Badge・Buttonなど全コンポーネントに一貫して反映されます。
        </Text>
        <Button variant="light">詳細を確認</Button>
      </Stack>
    </Card>
  </AppProvider>
)
