import { createFileRoute } from '@tanstack/react-router'
import { Button, Card, Container, Stack, Text, Title } from '@mantine/core'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>app-factory 雛形へようこそ</Title>
        <Text c="dimmed">
          これは app-factory の雛形アプリです。TanStack Start・Mantine
          v9・Cloudflareを使い、小さなWebアプリを次々とデプロイするための
          出発点として使ってください。
        </Text>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Title order={3}>技術スタック</Title>
            <Text size="sm">TanStack Start（React 19）</Text>
            <Text size="sm">Mantine v9（UIコンポーネント）</Text>
            <Text size="sm">Vite+（vp）でコマンドを統一</Text>
            <Text size="sm">Cloudflare Workers にデプロイ</Text>
          </Stack>
        </Card>

        <Button component="a" href="https://developers.cloudflare.com/workers/" target="_blank" rel="noreferrer">
          Cloudflare Workers のドキュメントを見る
        </Button>
      </Stack>
    </Container>
  )
}
