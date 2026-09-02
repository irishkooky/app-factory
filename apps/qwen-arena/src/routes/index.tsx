import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Code,
  Container,
  Group,
  Loader,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core'
import { MODELS, PROVIDERS, getModel, getProvider, type ProviderId } from '../data/models'
import { PRESETS, getPreset } from '../data/presets'
import { formatJpy, formatJpyPerCall, formatUsd, monthlyCost } from '../lib/cost'
import { runModel, getAvailability, type RunResult } from '../server/run'
import { judgeOutputs, type JudgeResult } from '../server/judge'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const DEFAULT_MAX_TOKENS = 1024
const DEFAULT_CALLS_PER_MONTH = 100_000
const COPY_LABEL_DEFAULT = '結果をMarkdownでコピー'
const COPY_LABEL_SUCCESS = 'コピーしました'
const COPY_LABEL_FAILURE = 'コピーできませんでした'
const COPY_LABEL_RESET_MS = 2000
const MARKDOWN_INPUT_PREVIEW_LENGTH = 50

type ResultsState = Record<string, RunResult | 'loading'>

function toNumber(value: number | string, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function renderJsonOrText(text: string) {
  try {
    const parsed: unknown = JSON.parse(text)
    return <Code block>{JSON.stringify(parsed, null, 2)}</Code>
  } catch {
    return <Text style={{ whiteSpace: 'pre-wrap' }}>{text}</Text>
  }
}

function HomeComponent() {
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id)
  const [system, setSystem] = useState<string>(PRESETS[0].system)
  const [input, setInput] = useState<string>(PRESETS[0].input)
  const [maxTokens, setMaxTokens] = useState<number | string>(DEFAULT_MAX_TOKENS)

  const [availability, setAvailability] = useState<Record<ProviderId, boolean> | null>(null)
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(
    () => new Set(MODELS.filter((m) => m.defaultOn).map((m) => m.id)),
  )

  const [results, setResults] = useState<ResultsState>({})
  const [callsPerMonth, setCallsPerMonth] = useState<number | string>(DEFAULT_CALLS_PER_MONTH)

  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null)
  const [judging, setJudging] = useState(false)

  const [copyLabel, setCopyLabel] = useState(COPY_LABEL_DEFAULT)

  // 実行の「世代」を数える。古い世代のレスポンスが遅れて返っても最新の実行結果を上書きしないようにする
  const runIdRef = useRef(0)
  // コピー連打で setTimeout が多重化してラベルがちらつかないよう、直前のタイマーを管理する
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const preset = getPreset(presetId) ?? PRESETS[0]

  useEffect(() => {
    let cancelled = false
    getAvailability()
      .then((res) => {
        if (!cancelled) setAvailability(res)
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = Object.fromEntries(PROVIDERS.map((p) => [p.id, false])) as Record<ProviderId, boolean>
          setAvailability(fallback)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // availabilityが判明したら、キー未設定プロバイダのモデルは自動でチェックを外す(チェックボックス自体はdisabledのまま)
  useEffect(() => {
    if (!availability) return
    setSelectedModelIds((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of prev) {
        const model = getModel(id)
        if (model && availability[model.provider] === false) {
          next.delete(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [availability])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const isRunning = Object.values(results).some((r) => r === 'loading')

  const successResults = useMemo(
    () => Object.values(results).filter((r): r is RunResult => r !== 'loading' && r.ok),
    [results],
  )

  function handlePresetChange(id: string) {
    const next = getPreset(id)
    if (!next) return
    setPresetId(id)
    setSystem(next.system)
    setInput(next.input)
    setResults({})
    setJudgeResult(null)
  }

  function toggleModel(id: string, checked: boolean) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  function handleRun() {
    const ids = MODELS.filter((m) => selectedModelIds.has(m.id)).map((m) => m.id)
    if (ids.length === 0) return

    const currentRunId = ++runIdRef.current

    setJudgeResult(null)
    // 前回の結果は引き継がず、今回選択したIDだけを 'loading' にした新しいオブジェクトに置き換える
    // (前回実行して今回外したモデルの結果カードを残さないため)
    setResults(() => {
      const next: ResultsState = {}
      for (const id of ids) next[id] = 'loading'
      return next
    })

    const resolvedMaxTokens = toNumber(maxTokens, DEFAULT_MAX_TOKENS)

    // Promise.all ではなく個別に fire する(遅いモデルが速いモデルを待たせないため)
    for (const id of ids) {
      runModel({ data: { modelId: id, system, input, maxTokens: resolvedMaxTokens } })
        .then((result) => {
          if (runIdRef.current !== currentRunId) return // 古い世代の結果は捨てる
          setResults((prev) => ({ ...prev, [id]: result }))
        })
        .catch((err: unknown) => {
          if (runIdRef.current !== currentRunId) return
          setResults((prev) => ({
            ...prev,
            [id]: {
              modelId: id,
              ok: false,
              text: '',
              inputTokens: 0,
              outputTokens: 0,
              latencyMs: 0,
              costUsd: 0,
              error: err instanceof Error ? err.message : String(err),
            },
          }))
        })
    }
  }

  async function handleJudge() {
    if (successResults.length < 2) return
    setJudging(true)
    try {
      const outputs = successResults.map((r) => ({ modelId: r.modelId, text: r.text }))
      const result = await judgeOutputs({
        data: { taskTitle: preset.title, rubric: preset.rubric, system, input, outputs },
      })
      setJudgeResult(result)
    } catch (err) {
      setJudgeResult({
        ok: false,
        scores: [],
        latencyMs: 0,
        costUsd: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setJudging(false)
    }
  }

  function buildMarkdown(): string {
    const callsResolved = toNumber(callsPerMonth, DEFAULT_CALLS_PER_MONTH)
    const rows = MODELS.filter((m) => m.id in results).map((m) => {
      const r = results[m.id]
      if (r === 'loading') return `| ${m.label} | 実行中 | - | - | - | - | - |`
      if (!r.ok) return `| ${m.label} | 失敗 | - | - | - | - | - |`
      const score = judgeResult?.ok ? judgeResult.scores.find((s) => s.modelId === m.id)?.score : undefined
      const costStr = r.usageMissing ? '計測不可' : formatUsd(r.costUsd)
      const monthlyStr = r.usageMissing ? '計測不可' : formatUsd(monthlyCost(r.costUsd, callsResolved))
      return `| ${m.label} | ${(r.latencyMs / 1000).toFixed(1)} | ${r.inputTokens} | ${r.outputTokens} | ${costStr} | ${monthlyStr} | ${score ?? '-'} |`
    })
    const inputPreview =
      input.length > MARKDOWN_INPUT_PREVIEW_LENGTH ? `${input.slice(0, MARKDOWN_INPUT_PREVIEW_LENGTH)}…` : input

    return [
      `# ${preset.title}`,
      '',
      `入力: ${inputPreview}`,
      '',
      '| モデル | 秒 | in | out | 1回$ | 月額$ | 点 |',
      '|---|---|---|---|---|---|---|',
      ...rows,
    ].join('\n')
  }

  async function handleCopyMarkdown() {
    const markdown = buildMarkdown()
    try {
      if (!navigator.clipboard) throw new Error('clipboard API unavailable')
      await navigator.clipboard.writeText(markdown)
      setCopyLabel(COPY_LABEL_SUCCESS)
    } catch {
      setCopyLabel(COPY_LABEL_FAILURE)
    } finally {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => {
        setCopyLabel(COPY_LABEL_DEFAULT)
        copyTimeoutRef.current = null
      }, COPY_LABEL_RESET_MS)
    }
  }

  const callsResolved = toNumber(callsPerMonth, DEFAULT_CALLS_PER_MONTH)
  const monthlyRows = MODELS.filter((m) => {
    const r = results[m.id]
    return r !== undefined && r !== 'loading' && r.ok
  }).map((model) => {
    const result = results[model.id] as RunResult
    const usageMissing = Boolean(result.usageMissing)
    const monthly = usageMissing ? 0 : monthlyCost(result.costUsd, callsResolved)
    return { model, result, monthly, usageMissing }
  })
  // 最安・最高のハイライト判定は、コストが実際に計測できた行だけを対象にする
  const measurableMonthlyValues = monthlyRows.filter((r) => !r.usageMissing).map((r) => r.monthly)
  const maxMonthly = measurableMonthlyValues.length > 0 ? Math.max(...measurableMonthlyValues) : 0
  const minMonthly = measurableMonthlyValues.length > 0 ? Math.min(...measurableMonthlyValues) : 0
  const hasSpread = maxMonthly !== minMonthly

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* 1. ヘッダー */}
        <Stack gap={4}>
          <Title order={1}>同じ仕事を、全部のモデルに投げる。</Title>
          <Text c="dimmed">
            SaaSに組み込むAI機能で、Qwenは何を任せられるか。出力・速度・コストを横並びで見る
          </Text>
        </Stack>

        {/* 2. タスク */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <SegmentedControl
              fullWidth
              value={presetId}
              onChange={handlePresetChange}
              disabled={isRunning}
              data={PRESETS.map((p) => ({ label: p.title, value: p.id }))}
            />
            <Text size="sm" c="dimmed">
              {preset.description}
            </Text>
            <Textarea
              label="system(指示)"
              value={system}
              onChange={(e) => setSystem(e.currentTarget.value)}
              autosize
              minRows={2}
              maxRows={6}
            />
            <Textarea
              label="input(入力)"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              autosize
              minRows={4}
              maxRows={12}
            />
            <NumberInput
              label="max_tokens"
              value={maxTokens}
              onChange={setMaxTokens}
              min={64}
              max={4096}
              allowDecimal={false}
              w={200}
            />
          </Stack>
        </Paper>

        {/* 3. モデル選択 */}
        <Stack gap="sm">
          <Title order={3}>モデル選択</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {PROVIDERS.map((provider) => {
              const providerModels = MODELS.filter((m) => m.provider === provider.id)
              const isAvailable = availability ? availability[provider.id] : undefined
              const disabled = availability !== null && !isAvailable

              return (
                <Paper key={provider.id} withBorder p="md" radius="md">
                  <Group justify="space-between" mb="sm" wrap="nowrap">
                    <Text fw={600} size="sm">
                      {provider.label}
                    </Text>
                    {availability === null ? (
                      <Badge color="gray" tt="none">
                        確認中
                      </Badge>
                    ) : isAvailable ? (
                      <Badge color="green" tt="none">
                        キーあり
                      </Badge>
                    ) : (
                      <Badge color="gray" tt="none">
                        キー未設定
                      </Badge>
                    )}
                  </Group>
                  <Stack gap="xs">
                    {providerModels.map((model) => (
                      <Checkbox
                        key={model.id}
                        label={model.note ? `${model.label}(${model.note})` : model.label}
                        checked={selectedModelIds.has(model.id)}
                        disabled={disabled}
                        onChange={(e) => toggleModel(model.id, e.currentTarget.checked)}
                      />
                    ))}
                  </Stack>
                </Paper>
              )
            })}
          </SimpleGrid>
        </Stack>

        {/* 4. 実行ボタン */}
        <Group justify="center">
          <Button size="lg" onClick={handleRun} disabled={selectedModelIds.size === 0 || isRunning} loading={isRunning}>
            選んだモデル全部に投げる
          </Button>
        </Group>

        {/* 5. 結果カード */}
        <Stack gap="sm">
          <Title order={3}>実行結果</Title>
          {Object.keys(results).length === 0 ? (
            <Text size="sm" c="dimmed">
              まだ実行していません。モデルを選んで「選んだモデル全部に投げる」を押してください。
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
              {MODELS.filter((m) => m.id in results).map((model) => {
                const result = results[model.id]
                const provider = getProvider(model.provider)
                const score = judgeResult?.ok ? judgeResult.scores.find((s) => s.modelId === model.id) : undefined

                return (
                  <Card key={model.id} withBorder radius="md" padding="md">
                    <Group justify="space-between" mb="xs" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={600} size="sm">
                          {model.label}
                        </Text>
                        <Badge color={provider.color} tt="none">
                          {provider.short}
                        </Badge>
                      </Group>
                      {score && (
                        <Tooltip label={score.reason} multiline w={240}>
                          <Badge color="yellow" tt="none">
                            {`★ ${score.score}/5`}
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>

                    {result === 'loading' ? (
                      <Group justify="center" py="xl">
                        <Loader size="sm" />
                      </Group>
                    ) : !result.ok ? (
                      <Alert color={result.keyMissing ? 'gray' : 'red'} title={result.keyMissing ? 'キー未設定' : '失敗'}>
                        <Text size="sm" style={{ wordBreak: 'break-all' }}>
                          {result.error}
                        </Text>
                      </Alert>
                    ) : (
                      <Stack gap="xs">
                        <Group gap="md">
                          <Text size="sm">⏱ {(result.latencyMs / 1000).toFixed(1)}s</Text>
                          <Text size="sm">
                            🔤 in {result.inputTokens} / out {result.outputTokens}
                          </Text>
                          <Text size="sm">
                            💰{' '}
                            {result.usageMissing
                              ? '計測不可'
                              : `${formatUsd(result.costUsd)} (${formatJpyPerCall(result.costUsd)})`}
                          </Text>
                        </Group>
                        <ScrollArea h={220}>
                          {preset.format === 'json' ? (
                            renderJsonOrText(result.text)
                          ) : (
                            <Text style={{ whiteSpace: 'pre-wrap' }}>{result.text}</Text>
                          )}
                        </ScrollArea>
                      </Stack>
                    )}
                  </Card>
                )
              })}
            </SimpleGrid>
          )}
        </Stack>

        {/* 6. 月間コスト試算(本題) */}
        <Paper withBorder p="lg" radius="md" bg="var(--mantine-color-body)" style={{ borderWidth: 2 }}>
          <Stack gap="md">
            <div>
              <Title order={3}>月間コスト試算 — ここが本題</Title>
              <Text size="sm" c="dimmed">
                同じ仕事を毎月これだけ繰り返したら、モデルごとの費用差はどれくらいになるか
              </Text>
            </div>
            <NumberInput
              label="月間呼び出し回数"
              value={callsPerMonth}
              onChange={setCallsPerMonth}
              min={0}
              step={1000}
              thousandSeparator=","
              allowDecimal={false}
              w={240}
            />
            {monthlyRows.length === 0 ? (
              <Text size="sm" c="dimmed">
                まだ結果がありません。モデルを実行すると、ここに月額試算が表示されます。
              </Text>
            ) : (
              <Table.ScrollContainer minWidth={640}>
                <Table striped withTableBorder highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>モデル</Table.Th>
                      <Table.Th>1回</Table.Th>
                      <Table.Th>月額USD</Table.Th>
                      <Table.Th>月額円</Table.Th>
                      <Table.Th>最も高いモデル比</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {monthlyRows.map(({ model, result, monthly, usageMissing }) => {
                      const isMin = !usageMissing && hasSpread && monthly === minMonthly
                      const isMax = !usageMissing && hasSpread && monthly === maxMonthly
                      const pct = !usageMissing && maxMonthly > 0 ? (monthly / maxMonthly) * 100 : null
                      return (
                        <Table.Tr
                          key={model.id}
                          style={{
                            backgroundColor: isMin
                              ? 'var(--mantine-color-green-light)'
                              : isMax
                                ? 'var(--mantine-color-red-light)'
                                : undefined,
                          }}
                        >
                          <Table.Td>{model.label}</Table.Td>
                          <Table.Td>{usageMissing ? '—' : formatUsd(result.costUsd)}</Table.Td>
                          <Table.Td>{usageMissing ? '—' : formatUsd(monthly)}</Table.Td>
                          <Table.Td>{usageMissing ? '—' : formatJpy(monthly)}</Table.Td>
                          <Table.Td>{pct === null ? '—' : `${pct.toFixed(0)}%`}</Table.Td>
                        </Table.Tr>
                      )
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Stack>
        </Paper>

        {/* 7. 採点 */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
              <Title order={3}>ブラインド採点</Title>
              <Button variant="light" onClick={handleJudge} loading={judging} disabled={successResults.length < 2}>
                Claude Opus 5 にブラインド採点させる
              </Button>
            </Group>
            {successResults.length < 2 && (
              <Text size="xs" c="dimmed">
                採点には成功した実行結果が2件以上必要です。
              </Text>
            )}
            {judgeResult && !judgeResult.ok && (
              <Alert color={judgeResult.keyMissing ? 'gray' : 'red'} title={judgeResult.keyMissing ? 'キー未設定' : '採点に失敗しました'}>
                <Text size="sm" style={{ wordBreak: 'break-all' }}>
                  {judgeResult.error}
                </Text>
              </Alert>
            )}
            {judgeResult?.ok && (
              <Stack gap="xs">
                <Text size="xs" c="dimmed">
                  採点コスト: {formatUsd(judgeResult.costUsd)}({formatJpyPerCall(judgeResult.costUsd)}) / {(judgeResult.latencyMs / 1000).toFixed(1)}s
                </Text>
                <Table.ScrollContainer minWidth={480}>
                  <Table striped withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>順位</Table.Th>
                        <Table.Th>モデル</Table.Th>
                        <Table.Th>点</Table.Th>
                        <Table.Th>理由</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {[...judgeResult.scores]
                        .sort((a, b) => b.score - a.score)
                        .map((s, i) => (
                          <Table.Tr key={s.modelId}>
                            <Table.Td>{i + 1}</Table.Td>
                            <Table.Td>{getModel(s.modelId)?.label ?? s.modelId}</Table.Td>
                            <Table.Td>{s.score}/5</Table.Td>
                            <Table.Td>{s.reason}</Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* 8. Markdownコピー */}
        <Group justify="center">
          <Button variant="subtle" onClick={handleCopyMarkdown} disabled={Object.keys(results).length === 0}>
            {copyLabel}
          </Button>
        </Group>

        {/* 9. フッター */}
        <Text size="xs" c="dimmed" ta="center">
          単価は 2026-09 時点の公開価格(USD/1Mトークン)。為替 1USD=150円で換算。キャッシュ割引・バッチ割引は未考慮
        </Text>
      </Stack>
    </Container>
  )
}
