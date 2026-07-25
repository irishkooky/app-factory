import { Box, Group, Paper, Stack, Text } from '@mantine/core'
import { colorOf } from '../game/colors'
import type { Player } from '../game/types'

const MEDALS = ['🥇', '🥈', '🥉']

type ScoreBoardProps = {
  players: Player[]
}

export function ScoreBoard({ players }: ScoreBoardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  if (sorted.length === 0) {
    return null
  }

  return (
    <Paper withBorder radius="lg" p="sm">
      <Stack gap={6}>
        {sorted.map((player, index) => (
          <Group key={player.id} justify="space-between" wrap="nowrap" gap="xs">
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
              <Text fw={700} w={26} ta="center" style={{ flexShrink: 0 }}>
                {MEDALS[index] ?? index + 1}
              </Text>
              <Box
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: colorOf(player.colorIndex),
                  flexShrink: 0,
                }}
              />
              <Text fw={600} truncate style={{ minWidth: 0 }}>
                {player.name}
              </Text>
            </Group>
            <Text fw={700} style={{ flexShrink: 0 }}>
              {player.score}
            </Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  )
}
