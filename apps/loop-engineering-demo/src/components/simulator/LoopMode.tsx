import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  ScrollArea,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Timeline,
  Title,
} from '@mantine/core'
import {
  mulberry32,
  simulateRun,
  type FeedbackQuality,
  type IterationEvent,
  type RunResult,
  type StopReason,
} from './engine'
import { RunChart } from './RunChart'

const QUALITY_OPTIONS: { label: string; value: FeedbackQuality }[] = [
  { label: 'なし（投げっぱなし）', value: 'none' },
  { label: '弱い（3回に1回確認）', value: 'weak' },
  { label: '強い（毎回テスト実行）', value: 'strong' },
]

const QUALITY_ORDER: FeedbackQuality[] = ['strong', 'weak', 'none']

type Phase = 'act' | 'observe' | 'judge'

const PHASES: { key: Phase; label: string }[] = [
  { key: 'act', label: '行動' },
  { key: 'observe', label: '観察' },
  { key: 'judge', label: '判定' },
]

const TICK_MS = 700

function resultAlert(result: RunResult) {
  const stoppedBy: StopReason = result.stoppedBy
  if (stoppedBy === 'goal') {
    return (
      <Alert color="green" title="ゴール達成でループ停止">
        {`${result.events.length}回の反復で全テスト通過。あなたのクリック数は 1回（実行ボタンだけ）。`}
      </Alert>
    )
  }
  if (stoppedBy === 'budget') {
    return (
      <Alert color="yellow" title="予算切れで停止">
        最終 {result.finalPassing}/10。フィードバックが弱いと収束が遅い。予算を増やすか検証を強くしよう。
      </Alert>
    )
  }
  return (
    <Alert color="red" title="エージェントの自己申告で“完了”">
      実際は {result.finalPassing}/10 しか通っていない。検証器のないループは『できました！』を信じるしかない。停止条件は必ず客観的な検証（テスト）に紐づけること。
    </Alert>
  )
}

function eventDescription(event: IterationEvent): string {
  if (event.observed === null) {
    return '（検証せず）'
  }
  return `テスト ${event.observed}/10 通過`
}

export function LoopMode() {
  const [maxIterations, setMaxIterations] = useState(10)
  const [quality, setQuality] = useState<FeedbackQuality>('strong')
  const [isRunning, setIsRunning] = useState(false)
  const [visibleEvents, setVisibleEvents] = useState<IterationEvent[]>([])
  const [completedRun, setCompletedRun] = useState<RunResult | null>(null)
  const [phase, setPhase] = useState<Phase>('act')
  const [runsByQuality, setRunsByQuality] = useState<Partial<Record<FeedbackQuality, RunResult>>>(
    {},
  )

  const pendingRunRef = useRef<RunResult | null>(null)
  const indexRef = useRef(0)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight })
  }, [visibleEvents])

  useEffect(() => {
    if (!isRunning) return undefined

    const interval = setInterval(() => {
      const run = pendingRunRef.current
      if (!run) {
        return
      }
      const idx = indexRef.current
      if (idx >= run.events.length) {
        clearInterval(interval)
        return
      }

      const event = run.events[idx]
      setVisibleEvents((prev) => [...prev, event])
      setPhase(PHASES[idx % PHASES.length].key)
      indexRef.current += 1

      if (indexRef.current >= run.events.length) {
        clearInterval(interval)
        setIsRunning(false)
        setCompletedRun(run)
        setRunsByQuality((prev) => ({ ...prev, [run.quality]: run }))
      }
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [isRunning])

  const handleRun = () => {
    if (isRunning) return
    const seed = Math.floor(Date.now() % 2 ** 31)
    const rng = mulberry32(seed)
    const result = simulateRun(quality, maxIterations, rng)

    pendingRunRef.current = result
    indexRef.current = 0
    setVisibleEvents([])
    setCompletedRun(null)
    setPhase('act')
    setIsRunning(true)
  }

  const handleClear = () => {
    if (isRunning) return
    setRunsByQuality({})
    setVisibleEvents([])
    setCompletedRun(null)
  }

  const runsForChart = QUALITY_ORDER.map((q) => runsByQuality[q]).filter(
    (run): run is RunResult => Boolean(run),
  )

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Stack gap={2}>
            <Text size="sm">ゴール: テスト 10/10 通過</Text>
            <Text size="sm">停止条件: ゴール達成 or 予算切れ</Text>
          </Stack>

          <Stack gap={4}>
            <Text size="sm" fw={500}>
              予算（最大反復回数）
            </Text>
            <Slider
              min={3}
              max={15}
              value={maxIterations}
              onChange={setMaxIterations}
              disabled={isRunning}
              marks={[3, 6, 9, 12, 15].map((value) => ({ value, label: String(value) }))}
              mb="lg"
            />
          </Stack>

          <Stack gap={4}>
            <Text size="sm" fw={500}>
              フィードバックの質
            </Text>
            <SegmentedControl
              fullWidth
              data={QUALITY_OPTIONS}
              value={quality}
              onChange={(value) => setQuality(value as FeedbackQuality)}
              disabled={isRunning}
            />
          </Stack>

          <Group grow>
            <Button size="lg" onClick={handleRun} loading={isRunning} disabled={isRunning}>
              ▶ ループを実行
            </Button>
          </Group>
        </Stack>
      </Card>

      <Group gap="xs">
        {PHASES.map((p) => (
          <Badge
            key={p.key}
            variant={isRunning && phase === p.key ? 'filled' : 'light'}
            color={isRunning && phase === p.key ? 'indigo' : 'gray'}
          >
            {p.label}
          </Badge>
        ))}
      </Group>

      <ScrollArea h={220} viewportRef={viewportRef} type="auto">
        {visibleEvents.length === 0 ? (
          <Text size="sm" c="dimmed">
            「▶ ループを実行」を押すと、ここに反復のログが再生されます。
          </Text>
        ) : (
          <Timeline active={visibleEvents.length - 1} bulletSize={18}>
            {visibleEvents.map((event) => (
              <Timeline.Item key={event.iteration} title={`反復 ${event.iteration}`}>
                <Stack gap={0}>
                  <Text size="sm">{event.action}</Text>
                  <Text size="sm" c="dimmed">
                    {eventDescription(event)}
                  </Text>
                  {event.note && (
                    <Text size="sm" c="dimmed" fs="italic">
                      {event.note}
                    </Text>
                  )}
                </Stack>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </ScrollArea>

      {completedRun && !isRunning && <Card withBorder radius="md">{resultAlert(completedRun)}</Card>}

      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Title order={4}>収束グラフ（比較）</Title>
          <Button variant="subtle" size="xs" onClick={handleClear} disabled={isRunning}>
            クリア
          </Button>
        </Group>
        <RunChart runs={runsForChart} />
      </Stack>

      <Alert color="indigo" variant="light">
        良いループ = ゴール + 検証器 + 停止条件 + 予算。ループの賢さはモデルではなく“フィードバックの質”で決まる。
      </Alert>
    </Stack>
  )
}
