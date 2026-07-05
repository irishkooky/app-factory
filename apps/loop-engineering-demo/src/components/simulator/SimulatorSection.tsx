import { useState } from 'react'
import { SegmentedControl, Stack, Text, Title } from '@mantine/core'
import { ManualMode } from './ManualMode'
import { LoopMode } from './LoopMode'

type Mode = 'manual' | 'loop'

export function SimulatorSection() {
  const [mode, setMode] = useState<Mode>('manual')

  return (
    <Stack gap="md">
      <Title order={2}>体験シミュレーター「あなた vs ループ」</Title>
      <Text>
        題材: “10個中3個しかテストが通らないコード” をAIエージェントに全部直させる。まず自分でプロンプトを打つ側を体験し、次にループを設計する側を体験してほしい。
      </Text>

      <SegmentedControl
        fullWidth
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        data={[
          { label: '手動プロンプト', value: 'manual' },
          { label: 'ループを設計', value: 'loop' },
        ]}
      />

      {mode === 'manual' ? <ManualMode /> : <LoopMode />}
    </Stack>
  )
}
