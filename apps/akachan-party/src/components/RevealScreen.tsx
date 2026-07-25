import { useEffect, useRef } from 'react'
import { Box, Stack, Text, UnstyledButton } from '@mantine/core'
import { colorOf, textOn } from '../game/colors'
import type { Player } from '../game/types'

type RevealScreenProps = {
  player: Player
  babyName: string
  autoPicked: boolean
  onNext: () => void
}

export function RevealScreen({ player, babyName, autoPicked, onNext }: RevealScreenProps) {
  // 表示直後の誤連打で card 画面を素通りしないよう、マウント後300msは入力を無視する。
  // さらに一度確定したら二重発火しないようロックする。
  const readyRef = useRef(false)
  const lockRef = useRef(false)

  useEffect(() => {
    readyRef.current = false
    lockRef.current = false
    const timer = setTimeout(() => {
      readyRef.current = true
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const handleClick = () => {
    if (!readyRef.current || lockRef.current) return
    lockRef.current = true
    onNext()
  }

  const background = colorOf(player.colorIndex)
  const textColor = textOn(background)

  return (
    <UnstyledButton
      onClick={handleClick}
      style={{
        display: 'block',
        width: '100%',
        minHeight: '100dvh',
        background,
      }}
    >
      <Stack align="center" justify="center" gap="md" style={{ minHeight: '100dvh', padding: '24px' }}>
        <Text size="lg" fw={600} ta="center" style={{ color: textColor, opacity: 0.85 }}>
          {babyName}が選んだのは…
        </Text>
        <Box className="pop-in" ta="center">
          <Text
            fw={900}
            ta="center"
            style={{
              color: textColor,
              fontSize: 'clamp(3rem, 18vw, 8rem)',
              lineHeight: 1.05,
              wordBreak: 'break-word',
            }}
          >
            {player.name}
          </Text>
        </Box>
        {autoPicked && (
          <Text size="sm" ta="center" style={{ color: textColor, opacity: 0.75 }}>
            {babyName}は寝ちゃったので、天の声が選びました
          </Text>
        )}
        <Text size="xs" ta="center" mt="xl" style={{ color: textColor, opacity: 0.75 }}>
          タップして次へ
        </Text>
      </Stack>
    </UnstyledButton>
  )
}
