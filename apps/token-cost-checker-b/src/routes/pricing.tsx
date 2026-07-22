import { createFileRoute } from '@tanstack/react-router'
import { Container, Stack, Table, Text, Title } from '@mantine/core'
import { MODELS } from '../lib/pricing'

export const Route = createFileRoute('/pricing')({
  component: PricingComponent,
})

function PricingComponent() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>モデル単価一覧</Title>

        <Table.ScrollContainer minWidth={480}>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>モデル</Table.Th>
                <Table.Th>入力($/MTok)</Table.Th>
                <Table.Th>出力($/MTok)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {MODELS.map((model) => (
                <Table.Tr key={model.id}>
                  <Table.Td>{model.name}</Table.Td>
                  <Table.Td>${model.inputPerMTok}</Table.Td>
                  <Table.Td>${model.outputPerMTok}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Text size="xs" c="dimmed">
          2026年7月時点の Claude API 標準単価。
        </Text>
      </Stack>
    </Container>
  )
}
