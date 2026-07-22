import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Badge,
  Container,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { PageLayout } from '../components/PageLayout'
import { DEFAULT_BASELINE_ID, MODELS, buildComparison, formatPct, formatSignedUSD, formatUSD } from '../lib/pricing'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const MODEL_OPTIONS = MODELS.map((model) => ({ value: model.id, label: model.name }))

function HomeComponent() {
  const [inputTokens, setInputTokens] = useState<number | string>(1_000_000)
  const [outputTokens, setOutputTokens] = useState<number | string>(200_000)
  const [baselineId, setBaselineId] = useState<string>(DEFAULT_BASELINE_ID)

  const rows = useMemo(() => {
    const safeInput = typeof inputTokens === 'number' ? inputTokens : 0
    const safeOutput = typeof outputTokens === 'number' ? outputTokens : 0
    return buildComparison(safeInput, safeOutput, baselineId)
  }, [inputTokens, outputTokens, baselineId])

  return (
    <PageLayout>
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>Claudeモデル料金電卓</Title>
            <Text c="dimmed">
              入力トークン数と出力トークン数を指定すると、モデルごとのコストと基準モデルとの差額・削減率を即時計算します。
            </Text>
          </Stack>

          <Group grow align="flex-start" wrap="wrap">
            <NumberInput
              label="入力トークン数"
              description="Input tokens"
              value={inputTokens}
              onChange={setInputTokens}
              min={0}
              step={1000}
              thousandSeparator=","
              clampBehavior="strict"
              allowNegative={false}
              hideControls
            />
            <NumberInput
              label="出力トークン数"
              description="Output tokens"
              value={outputTokens}
              onChange={setOutputTokens}
              min={0}
              step={1000}
              thousandSeparator=","
              clampBehavior="strict"
              allowNegative={false}
              hideControls
            />
            <Select
              label="基準モデル"
              description="差額・削減率の比較基準"
              data={MODEL_OPTIONS}
              value={baselineId}
              onChange={(value) => value && setBaselineId(value)}
              allowDeselect={false}
            />
          </Group>

          <Table.ScrollContainer minWidth={640}>
            <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>モデル</Table.Th>
                  <Table.Th>入力コスト</Table.Th>
                  <Table.Th>出力コスト</Table.Th>
                  <Table.Th>合計コスト</Table.Th>
                  <Table.Th>基準との差額</Table.Th>
                  <Table.Th>削減率</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.model.id}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={row.isBaseline ? 700 : 500}>{row.model.name}</Text>
                        {row.isBaseline && (
                          <Badge size="sm" variant="light">
                            基準
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{formatUSD(row.cost.inputCost)}</Table.Td>
                    <Table.Td>{formatUSD(row.cost.outputCost)}</Table.Td>
                    <Table.Td>
                      <Text fw={600}>{formatUSD(row.cost.totalCost)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c={row.diffFromBaseline > 0 ? 'red' : row.diffFromBaseline < 0 ? 'teal' : 'dimmed'}>
                        {formatSignedUSD(row.diffFromBaseline)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        c={
                          row.reductionPctFromBaseline === null || row.reductionPctFromBaseline === 0
                            ? 'dimmed'
                            : row.reductionPctFromBaseline > 0
                              ? 'teal'
                              : 'red'
                        }
                      >
                        {formatPct(row.reductionPctFromBaseline)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Text size="sm" c="dimmed">
            削減率は基準モデル比での合計コスト削減幅（プラスが安い）。単価の一覧は「料金表」ページを参照してください。
          </Text>
        </Stack>
      </Container>
    </PageLayout>
  )
}
