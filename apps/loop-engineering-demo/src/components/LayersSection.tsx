import { useState } from 'react'
import { Box, Card, Stack, Text, Title } from '@mantine/core'

interface LayerInfo {
  key: string
  label: string
  target: string
  description: string
  example: string
}

// 配列は「外側 → 内側」の順。ループエンジニアリングが最外層で、
// プロンプトエンジニアリングを内側に“包み込む”構造を表現する。
const LAYERS: LayerInfo[] = [
  {
    key: 'loop',
    label: 'ループエンジニアリング',
    target: '反復サイクルそのもの',
    description:
      'ゴール・検証器・停止条件を決め、エージェントが自走して収束する反復の仕組みを設計する',
    example: '「テストが全部通るまで、修正→テスト→判定を繰り返せ」',
  },
  {
    key: 'harness',
    label: 'ハーネスエンジニアリング',
    target: '実行環境と道具',
    description: 'エージェントが動く環境（ツール、権限、サンドボックス、CI）を整備する',
    example: 'テスト実行・ファイル編集・ブラウザ操作の道具を与える',
  },
  {
    key: 'context',
    label: 'コンテキストエンジニアリング',
    target: 'モデルが見る情報すべて',
    description:
      '指示文だけでなく、参照資料・コード・過去のやり取りなど“見せる情報”全体を設計する',
    example: '関連ファイルや仕様書をまとめて渡す',
  },
  {
    key: 'prompt',
    label: 'プロンプトエンジニアリング',
    target: '送る言葉',
    description: '1回の指示文の書き方を工夫する（2023年頃の主役）',
    example: '「あなたは優秀なプログラマです。◯◯を実装して」',
  },
]

function NestedLayer({
  index,
  selected,
  onSelect,
}: Readonly<{
  index: number
  selected: string
  onSelect: (key: string) => void
}>) {
  const layer = LAYERS[index]
  const isSelected = selected === layer.key
  const isInnermost = index === LAYERS.length - 1

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(layer.key)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.stopPropagation()
          onSelect(layer.key)
        }
      }}
      p="md"
      style={{
        border: `2px solid ${
          isSelected ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-default-border)'
        }`,
        borderRadius: 'var(--mantine-radius-md)',
        background: isSelected ? 'var(--mantine-color-indigo-light)' : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }}
    >
      <Text fw={600} size="sm" mb={isInnermost ? 0 : 'md'}>
        {layer.label}
      </Text>
      {!isInnermost && (
        <NestedLayer index={index + 1} selected={selected} onSelect={onSelect} />
      )}
    </Box>
  )
}

export function LayersSection() {
  const [selected, setSelected] = useState<string>('loop')
  const active = LAYERS.find((l) => l.key === selected) ?? LAYERS[0]

  return (
    <Stack gap="md">
      <Title order={2}>プロンプトからループへ — 4つの階層</Title>
      <Text>
        ループエンジニアリングは突然現れたのではなく、AIの使い方の進化の最外層。各層は前の層を置き換えるのではなく“包み込む”。
      </Text>

      <NestedLayer index={0} selected={selected} onSelect={setSelected} />

      <Card withBorder radius="md" padding="lg">
        <Stack gap={4}>
          <Title order={4}>{active.label}</Title>
          <Text size="sm" c="dimmed">
            設計対象: {active.target}
          </Text>
          <Text size="sm">{active.description}</Text>
          <Text size="sm" c="dimmed">
            例: {active.example}
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}
