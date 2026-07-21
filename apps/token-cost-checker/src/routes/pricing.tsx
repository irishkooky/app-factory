import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  Container,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { MODELS, formatUSD } from '../lib/pricing'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

function PricingPage() {
  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1} size="h2">
            モデル単価一覧
          </Title>
          <Text c="dimmed" size="sm">
            Claude APIの標準料金（USD / 100万トークン）です。
          </Text>
        </Stack>

        <Card withBorder radius="md" padding="lg">
          <Table.ScrollContainer minWidth={480}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>モデル</Table.Th>
                  <Table.Th ta="right">入力（$ / MTok）</Table.Th>
                  <Table.Th ta="right">出力（$ / MTok）</Table.Th>
                  <Table.Th>備考</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MODELS.map((model) => (
                  <Table.Tr key={model.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {model.name}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">{formatUSD(model.inputPerMTok)}</Table.Td>
                    <Table.Td ta="right">{formatUSD(model.outputPerMTok)}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {model.note ?? '—'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        <Text size="xs" c="dimmed">
          料金は1Mトークン（100万トークン）あたりのUSD建て標準価格です。プロンプトキャッシュやBatch
          APIの割引は含まれていません。最新の料金は Anthropic 公式の料金ページを確認してください。
        </Text>
      </Stack>
    </Container>
  )
}
