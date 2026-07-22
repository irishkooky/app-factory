import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { calcCost, DEFAULT_BASE_MODEL_ID, formatUsd, MODELS } from '../models'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const toTokens = (v: number | string): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function HomeComponent() {
  const [inputTokens, setInputTokens] = useState<number | string>('')
  const [outputTokens, setOutputTokens] = useState<number | string>('')
  const [baseModelId, setBaseModelId] = useState<string>(DEFAULT_BASE_MODEL_ID)

  const inputTok = toTokens(inputTokens)
  const outputTok = toTokens(outputTokens)

  const baseModel = MODELS.find((m) => m.id === baseModelId) ?? MODELS[0]
  const baseTotal = calcCost(baseModel, inputTok, outputTok).total

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Token Cost Checker</Title>
          <Text c="dimmed">Claudeモデル料金電卓 (Fable Orchestration)</Text>
        </div>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Group grow>
              <NumberInput
                label="入力トークン数"
                value={inputTokens}
                onChange={setInputTokens}
                min={0}
                step={1000}
                thousandSeparator=","
                allowNegative={false}
                allowDecimal={false}
                placeholder="例: 100000"
              />
              <NumberInput
                label="出力トークン数"
                value={outputTokens}
                onChange={setOutputTokens}
                min={0}
                step={1000}
                thousandSeparator=","
                allowNegative={false}
                allowDecimal={false}
                placeholder="例: 100000"
              />
            </Group>

            <Select
              label="基準モデル"
              data={MODELS.map((m) => ({ value: m.id, label: m.name }))}
              value={baseModelId}
              onChange={(v) => v && setBaseModelId(v)}
              allowDeselect={false}
            />
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>モデル</Table.Th>
                  <Table.Th>入力コスト</Table.Th>
                  <Table.Th>出力コスト</Table.Th>
                  <Table.Th>合計</Table.Th>
                  <Table.Th>基準との差額</Table.Th>
                  <Table.Th>削減率</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MODELS.map((model) => {
                  const { inputCost, outputCost, total } = calcCost(model, inputTok, outputTok)
                  const isBase = model.id === baseModelId
                  const diff = total - baseTotal
                  const reduction =
                    isBase || baseTotal <= 0 ? null : ((baseTotal - total) / baseTotal) * 100

                  return (
                    <Table.Tr key={model.id}>
                      <Table.Td>
                        <Group gap="xs">
                          <Text fw={500}>{model.name}</Text>
                          {isBase && <Badge>基準</Badge>}
                        </Group>
                      </Table.Td>
                      <Table.Td>{formatUsd(inputCost)}</Table.Td>
                      <Table.Td>{formatUsd(outputCost)}</Table.Td>
                      <Table.Td>{formatUsd(total)}</Table.Td>
                      <Table.Td>
                        {isBase || baseTotal <= 0 ? (
                          '—'
                        ) : (
                          <Text c={diff > 0 ? 'red' : 'teal'} span>
                            {`${diff > 0 ? '+' : '-'}${formatUsd(Math.abs(diff))}`}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {reduction === null ? (
                          '—'
                        ) : (
                          <Text c={reduction > 0 ? 'teal' : 'red'} span>
                            {`${Math.abs(reduction).toFixed(1)}%${reduction > 0 ? '削減' : '増'}`}
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        <Text size="xs" c="dimmed">
          料金は 1M トークンあたりの単価（MTok）に基づく概算です。
        </Text>

        <Button variant="light" component={Link} to="/pricing">
          モデル単価一覧を見る
        </Button>
      </Stack>
    </Container>
  )
}
