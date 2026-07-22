import { createFileRoute } from '@tanstack/react-router'
import { Container, Stack, Table, Text, Title } from '@mantine/core'
import { PageLayout } from '../components/PageLayout'
import { MODELS } from '../lib/pricing'

export const Route = createFileRoute('/pricing')({
  component: PricingComponent,
})

function PricingComponent() {
  return (
    <PageLayout>
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>モデル単価一覧</Title>
            <Text c="dimmed">各モデルの100万トークン（MTok）あたりの単価です。金額はすべて米ドル（USD）。</Text>
          </Stack>

          <Table.ScrollContainer minWidth={480}>
            <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>モデル</Table.Th>
                  <Table.Th>入力単価（$/MTok）</Table.Th>
                  <Table.Th>出力単価（$/MTok）</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MODELS.map((model) => (
                  <Table.Tr key={model.id}>
                    <Table.Td>
                      <Text fw={500}>{model.name}</Text>
                    </Table.Td>
                    <Table.Td>${model.inputPricePerMTok.toFixed(2)}</Table.Td>
                    <Table.Td>${model.outputPricePerMTok.toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      </Container>
    </PageLayout>
  )
}
