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
  Switch,
  Table,
  Text,
  Title,
} from '@mantine/core'
import {
  MODELS,
  DEFAULT_BASE_MODEL_ID,
  calcCost,
  formatUsd,
} from '../models'

export const Route = createFileRoute('/')({
  component: CalculatorPage,
})

function toTokens(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function CalculatorPage() {
  const [inputTokens, setInputTokens] = useState<string | number>(100_000)
  const [outputTokens, setOutputTokens] = useState<string | number>(10_000)
  const [baseModelId, setBaseModelId] = useState<string>(DEFAULT_BASE_MODEL_ID)
  const [showComparison, setShowComparison] = useState(true)

  const inTok = toTokens(inputTokens)
  const outTok = toTokens(outputTokens)

  const rows = useMemo(
    () => MODELS.map((m) => calcCost(m, inTok, outTok)),
    [inTok, outTok],
  )
  const base = rows.find((r) => r.model.id === baseModelId) ?? rows[0]

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>Claudeモデル料金電卓</Title>
          <Text c="dimmed" size="sm">
            トークン数を入力すると、各Claudeモデルの利用コストを即時に計算します。
          </Text>
        </Stack>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="入力トークン数"
                description="プロンプトなど、モデルに渡すトークン数"
                value={inputTokens}
                onChange={setInputTokens}
                min={0}
                step={1000}
                thousandSeparator=","
                allowNegative={false}
                allowDecimal={false}
              />
              <NumberInput
                label="出力トークン数"
                description="モデルが生成するトークン数"
                value={outputTokens}
                onChange={setOutputTokens}
                min={0}
                step={1000}
                thousandSeparator=","
                allowNegative={false}
                allowDecimal={false}
              />
            </SimpleGrid>
            <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
              <Select
                label="基準モデル"
                description="差額・削減率の比較基準"
                data={MODELS.map((m) => ({ value: m.id, label: m.name }))}
                value={baseModelId}
                onChange={(v) => v && setBaseModelId(v)}
                allowDeselect={false}
                w={{ base: '100%', sm: 260 }}
              />
              <Switch
                label="基準モデルとの比較を表示"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.currentTarget.checked)}
              />
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Title order={4}>計算結果</Title>
            <Table.ScrollContainer minWidth={showComparison ? 720 : 520}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>モデル</Table.Th>
                    <Table.Th ta="right">入力コスト</Table.Th>
                    <Table.Th ta="right">出力コスト</Table.Th>
                    <Table.Th ta="right">合計</Table.Th>
                    {showComparison && (
                      <>
                        <Table.Th ta="right">差額(基準比)</Table.Th>
                        <Table.Th ta="right">削減率</Table.Th>
                      </>
                    )}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((r) => {
                    const isBase = r.model.id === base.model.id
                    const diff = r.totalCost - base.totalCost
                    const savingRate =
                      base.totalCost > 0
                        ? ((base.totalCost - r.totalCost) / base.totalCost) * 100
                        : 0
                    return (
                      <Table.Tr key={r.model.id}>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Badge color={r.model.color} variant="light">
                              {r.model.name}
                            </Badge>
                            {isBase && (
                              <Badge color="gray" variant="outline" size="xs">
                                基準
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td ta="right">{formatUsd(r.inputCost)}</Table.Td>
                        <Table.Td ta="right">{formatUsd(r.outputCost)}</Table.Td>
                        <Table.Td ta="right" fw={700}>
                          {formatUsd(r.totalCost)}
                        </Table.Td>
                        {showComparison && (
                          <>
                            <Table.Td ta="right">
                              {isBase ? (
                                <Text size="sm" c="dimmed">
                                  —
                                </Text>
                              ) : (
                                <Text
                                  size="sm"
                                  c={diff > 0 ? 'red' : diff < 0 ? 'teal' : 'dimmed'}
                                >
                                  {diff > 0 ? '+' : diff < 0 ? '−' : ''}
                                  {formatUsd(Math.abs(diff))}
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td ta="right">
                              {isBase || base.totalCost === 0 ? (
                                <Text size="sm" c="dimmed">
                                  —
                                </Text>
                              ) : (
                                <Text
                                  size="sm"
                                  c={savingRate > 0 ? 'teal' : savingRate < 0 ? 'red' : 'dimmed'}
                                >
                                  {savingRate > 0
                                    ? `${savingRate.toFixed(1)}% 削減`
                                    : savingRate < 0
                                      ? `${Math.abs(savingRate).toFixed(1)}% 割増`
                                      : '±0%'}
                                </Text>
                              )}
                            </Table.Td>
                          </>
                        )}
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Text size="xs" c="dimmed">
              単価はモデル単価表ページの USD per MTok(100万トークンあたり)に基づく概算です。
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
