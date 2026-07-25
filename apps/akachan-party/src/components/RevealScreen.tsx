import { Box, Stack, Text, UnstyledButton } from '@mantine/core'
import { colorOf } from '../game/colors'
import type { Player } from '../game/types'

type RevealScreenProps = {
  player: Player
  babyName: string
  autoPicked: boolean
  onNext: () => void
}

export function RevealScreen({ player, babyName, autoPicked, onNext }: RevealScreenProps) {
  return (
    <UnstyledButton
      onClick={onNext}
      style={{
        display: 'block',
        width: '100%',
        minHeight: '100dvh',
        background: colorOf(player.colorIndex),
      }}
    >
      <Stack
        align="center"
        justify="center"
        gap="md"
        style={{ minHeight: '100dvh', padding: '24px' }}
      >
        <Text size="lg" fw={600} c="dark.9" ta="center">
          {babyName}が選んだのは…
        </Text>
        <Box className="pop-in" ta="center">
          <Text
            fw={900}
            c="dark.9"
            ta="center"
            style={{ fontSize: 'clamp(3rem, 18vw, 8rem)', lineHeight: 1.05, wordBreak: 'break-word' }}
          >
            {player.name}
          </Text>
        </Box>
        {autoPicked && (
          <Text size="sm" c="dark.8" ta="center">
            {babyName}は寝ちゃったので、天の声が選びました
          </Text>
        )}
        <Text size="xs" c="dark.8" ta="center" mt="xl">
          タップして次へ
        </Text>
      </Stack>
    </UnstyledButton>
  )
}
