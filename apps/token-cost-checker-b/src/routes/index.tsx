import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Badge,
  Container,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import {
  MODELS,
  calcCost,
  formatDiff,
  formatUsd,
  normalizeTokens,
  savingsRate,
  type ModelId,
} from '../lib/pricing'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const [inputTokens, setInputTokens] = useState<string | number>(1_000_000)
  const [outputTokens, setOutputTokens] = useState<string | number>(100_000)
  const [baseModelId, setBaseModelId] = useState<ModelId>('fable-5')

  const inTok = normalizeTokens(inputTokens)
  const outTok = normalizeTokens(outputTokens)
  const base = MODELS.find((m) => m.id === baseModelId) ?? MODELS[0]
  const baseTotal = calcCost(base, inTok, outTok).total

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>Token Cost Checker B</Title>
        <Text c="dimmed">
          入力/出力トークン数を指定すると、各Claudeモデルの概算コストを即時に一覧表示します。
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="入力トークン数"
            min={0}
            step={100000}
            thousandSeparator=","
            allowNegative={false}
            allowDecimal={false}
            value={inputTokens}
            onChange={setInputTokens}
          />
          <NumberInput
            label="出力トークン数"
            min={0}
            step={100000}
            thousandSeparator=","
            allowNegative={false}
            allowDecimal={false}
            value={outputTokens}
            onChange={setOutputTokens}
          />
          <Select
            label="基準モデル"
            data={MODELS.map((m) => ({ value: m.id, label: m.name }))}
            value={baseModelId}
            onChange={(value) => {
              if (value && MODELS.some((m) => m.id === value)) {
                setBaseModelId(value as ModelId)
              }
            }}
          />
        </SimpleGrid>

        <Table.ScrollContainer minWidth={720}>
          <Table striped highlightOnHover withTableBorder>
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
                const { inputCost, outputCost, total } = calcCost(model, inTok, outTok)
                const isBase = model.id === baseModelId
                const diff = total - baseTotal
                const rate = savingsRate(baseTotal, total)

                return (
                  <Table.Tr key={model.id}>
                    <Table.Td>{model.name}</Table.Td>
                    <Table.Td>{formatUsd(inputCost)}</Table.Td>
                    <Table.Td>{formatUsd(outputCost)}</Table.Td>
                    <Table.Td>{formatUsd(total)}</Table.Td>
                    <Table.Td>
                      {isBase ? (
                        <Badge variant="light">基準</Badge>
                      ) : (
                        <Text c={diff === 0 ? 'dimmed' : diff < 0 ? 'teal' : 'red'} component="span">
                          {formatDiff(diff)}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {isBase ? (
                        <Badge variant="light">基準</Badge>
                      ) : rate === null ? (
                        '—'
                      ) : (
                        <Text c={rate < 0 ? 'red' : undefined} component="span">
                          {rate.toFixed(1)}%
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Text size="xs" c="dimmed">
          単価: 入力/出力とも 100万トークンあたりの米ドル。プロンプトキャッシュ・バッチ割引は考慮していません。
        </Text>
      </Stack>
    </Container>
  )
}
