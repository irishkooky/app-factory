import { createFileRoute } from '@tanstack/react-router'
import {
  Badge,
  Card,
  Container,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { MODELS } from '../models'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

function PricingPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>モデル単価表</Title>
          <Text c="dimmed" size="sm">
            料金電卓で使用しているClaudeモデルの単価一覧です(USD per MTok = 100万トークンあたりの米ドル)。
          </Text>
        </Stack>

        <Card withBorder radius="md" padding="lg">
          <Table.ScrollContainer minWidth={480}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>モデル</Table.Th>
                  <Table.Th>モデルID</Table.Th>
                  <Table.Th ta="right">入力単価</Table.Th>
                  <Table.Th ta="right">出力単価</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MODELS.map((m) => (
                  <Table.Tr key={m.id}>
                    <Table.Td>
                      <Badge color={m.color} variant="light">
                        {m.name}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {m.id}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">${m.inputPerMTok.toFixed(2)} / MTok</Table.Td>
                    <Table.Td ta="right">${m.outputPerMTok.toFixed(2)} / MTok</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      </Stack>
    </Container>
  )
}
