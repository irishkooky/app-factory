import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Badge,
  Card,
  Container,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import {
  DEFAULT_BASELINE_ID,
  MODELS,
  calcCost,
  formatUSD,
} from '../lib/pricing'

export const Route = createFileRoute('/')({
  component: CalculatorPage,
})

function toTokens(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function CalculatorPage() {
  const [inputTokensRaw, setInputTokensRaw] = useState<string | number>(100_000)
  const [outputTokensRaw, setOutputTokensRaw] = useState<string | number>(10_000)
  const [baselineId, setBaselineId] = useState<string>(DEFAULT_BASELINE_ID)

  const inputTokens = toTokens(inputTokensRaw)
  const outputTokens = toTokens(outputTokensRaw)

  const rows = useMemo(() => {
    const baselineModel =
      MODELS.find((m) => m.id === baselineId) ?? MODELS[0]
    const baselineCost = calcCost(baselineModel, inputTokens, outputTokens)

    return MODELS.map((model) => {
      const cost = calcCost(model, inputTokens, outputTokens)
      const diff = cost.totalCost - baselineCost.totalCost
      const savingsRate =
        baselineCost.totalCost > 0
          ? ((baselineCost.totalCost - cost.totalCost) / baselineCost.totalCost) * 100
          : null
      return { model, cost, diff, savingsRate, isBaseline: model.id === baselineModel.id }
    })
  }, [inputTokens, outputTokens, baselineId])

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1} size="h2">
            Claudeモデル料金電卓
          </Title>
          <Text c="dimmed" size="sm">
            トークン数を入力すると、各Claudeモデルのコストを即時計算します（単価はUSD / 100万トークン）。
          </Text>
        </Stack>

        <Card withBorder radius="md" padding="lg">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <NumberInput
              label="入力トークン数"
              value={inputTokensRaw}
              onChange={setInputTokensRaw}
              min={0}
              step={1000}
              thousandSeparator=","
              allowNegative={false}
              allowDecimal={false}
              placeholder="例: 100,000"
            />
            <NumberInput
              label="出力トークン数"
              value={outputTokensRaw}
              onChange={setOutputTokensRaw}
              min={0}
              step={1000}
              thousandSeparator=","
              allowNegative={false}
              allowDecimal={false}
              placeholder="例: 10,000"
            />
            <Select
              label="基準モデル（差額・削減率の基準）"
              value={baselineId}
              onChange={(v) => setBaselineId(v ?? DEFAULT_BASELINE_ID)}
              data={MODELS.map((m) => ({ value: m.id, label: m.name }))}
              allowDeselect={false}
            />
          </SimpleGrid>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Title order={2} size="h4">
              コスト比較
            </Title>
            <Table.ScrollContainer minWidth={640}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>モデル</Table.Th>
                    <Table.Th ta="right">入力コスト</Table.Th>
                    <Table.Th ta="right">出力コスト</Table.Th>
                    <Table.Th ta="right">合計</Table.Th>
                    <Table.Th ta="right">基準との差額</Table.Th>
                    <Table.Th ta="right">削減率</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map(({ model, cost, diff, savingsRate, isBaseline }) => (
                    <Table.Tr key={model.id}>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" fw={isBaseline ? 700 : 400}>
                            {model.name}
                          </Text>
                          {isBaseline && (
                            <Badge size="xs" variant="light" color="indigo">
                              基準
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td ta="right">{formatUSD(cost.inputCost)}</Table.Td>
                      <Table.Td ta="right">{formatUSD(cost.outputCost)}</Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={600}>
                          {formatUSD(cost.totalCost)}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        {isBaseline ? (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        ) : (
                          <Text size="sm" c={diff > 0 ? 'red.7' : diff < 0 ? 'teal.7' : 'dimmed'}>
                            {diff > 0 ? '+' : ''}
                            {formatUSD(diff)}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td ta="right">
                        {isBaseline || savingsRate === null ? (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        ) : (
                          <Text
                            size="sm"
                            c={savingsRate > 0 ? 'teal.7' : savingsRate < 0 ? 'red.7' : 'dimmed'}
                          >
                            {savingsRate > 0 ? '-' : savingsRate < 0 ? '+' : ''}
                            {Math.abs(savingsRate).toFixed(1)}%
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Text size="xs" c="dimmed">
              削減率は基準モデルの合計コストに対する削減割合です。基準よりも高いモデルは「+」（割増）で表示されます。
              トークン数が0の場合、削減率は表示されません。
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
