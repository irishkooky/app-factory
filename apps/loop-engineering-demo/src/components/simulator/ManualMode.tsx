import { useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Group, Progress, ScrollArea, Stack, Text } from '@mantine/core'
import { INITIAL_PASSING, TOTAL_TESTS, mulberry32 } from './engine'

const MANUAL_SEED = 20260705

type Phase = 'instruct' | 'verify'

export function ManualMode() {
  const [passing, setPassing] = useState(INITIAL_PASSING)
  const [phase, setPhase] = useState<Phase>('instruct')
  const [clicks, setClicks] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const rngRef = useRef(mulberry32(MANUAL_SEED))
  const pendingDeltaRef = useRef(0)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight })
  }, [log])

  const clampPassing = (value: number) => Math.min(TOTAL_TESTS, Math.max(0, value))

  const handleInstruct = () => {
    if (phase !== 'instruct' || passing >= TOTAL_TESTS) return
    const delta = 1 + Math.floor(rngRef.current() * 2) // +1 or +2
    pendingDeltaRef.current = delta
    setClicks((c) => c + 1)
    setLog((l) => [...l, 'AIが修正した…結果はテストを回すまで不明'])
    setPhase('verify')
  }

  const handleVerify = () => {
    if (phase !== 'verify') return
    setClicks((c) => c + 1)
    const next = clampPassing(passing + pendingDeltaRef.current)
    setPassing(next)
    setLog((l) => [...l, `テスト ${next}/10 通過`])
    setPhase('instruct')
  }

  const handleReset = () => {
    setPassing(INITIAL_PASSING)
    setPhase('instruct')
    setClicks(0)
    setLog([])
    pendingDeltaRef.current = 0
    rngRef.current = mulberry32(MANUAL_SEED)
  }

  const done = passing >= TOTAL_TESTS

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text size="xl" fw={700}>
          テスト {passing}/10 通過
        </Text>
        <Badge size="lg" variant="light">
          あなたのクリック数: {clicks}
        </Badge>
      </Group>

      <Progress value={(passing / TOTAL_TESTS) * 100} size="lg" radius="xl" />

      <Group grow>
        <Button onClick={handleInstruct} disabled={phase !== 'instruct' || done}>
          ① AIに修正を指示する
        </Button>
        <Button onClick={handleVerify} disabled={phase !== 'verify' || done} variant="outline">
          ② テストを実行して確認する
        </Button>
      </Group>

      <ScrollArea h={160} viewportRef={viewportRef} type="auto">
        <Stack gap={4}>
          {log.length === 0 && (
            <Text size="sm" c="dimmed">
              まだ操作していません。「① AIに修正を指示する」から始めてください。
            </Text>
          )}
          {log.map((entry, index) => (
            <Text size="sm" key={`${index}-${entry}`}>
              {entry}
            </Text>
          ))}
        </Stack>
      </ScrollArea>

      {done && (
        <Alert color="green" title="全テスト通過！">
          <Stack gap="sm">
            <Text size="sm">
              {`ただし、指示→確認を繰り返してボタンを${clicks}回押したのはあなた。つまり“ループ”を人力で回していたのはあなた自身。この反復を仕組みに任せるのがループエンジニアリング。`}
            </Text>
            <Button onClick={handleReset} variant="light" w="fit-content">
              リセット
            </Button>
          </Stack>
        </Alert>
      )}
    </Stack>
  )
}
