import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, Card, Code, Container, Stack, Table, Text, Title } from '@mantine/core'
import { MODELS } from '../models'

export const Route = createFileRoute('/pricing')({
  component: PricingComponent,
})

function PricingComponent() {
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>モデル単価一覧</Title>
          <Text c="dimmed">1Mトークン（MTok）あたりの料金（USD）</Text>
        </div>

        <Card withBorder radius="md" padding="lg">
          <Table.ScrollContainer minWidth={480}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>モデル</Table.Th>
                  <Table.Th>モデルID</Table.Th>
                  <Table.Th>入力 ($/MTok)</Table.Th>
                  <Table.Th>出力 ($/MTok)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MODELS.map((model) => (
                  <Table.Tr key={model.id}>
                    <Table.Td>{model.name}</Table.Td>
                    <Table.Td>
                      <Code>{model.id}</Code>
                    </Table.Td>
                    <Table.Td>${model.inputPerMTok.toFixed(2)}</Table.Td>
                    <Table.Td>${model.outputPerMTok.toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        <Button variant="light" component={Link} to="/">
          電卓へ戻る
        </Button>
      </Stack>
    </Container>
  )
}
