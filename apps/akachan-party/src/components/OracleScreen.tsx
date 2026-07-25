import { useEffect, useRef } from 'react'
import { Box, Text, UnstyledButton } from '@mantine/core'
import { colorOf } from '../game/colors'
import type { Player, PlayerId } from '../game/types'

const TIMEOUT_MS = 20_000

function columnsFor(count: number): number {
  if (count <= 4) return 2
  if (count <= 9) return 3
  return 4
}

type OracleScreenProps = {
  players: Player[]
  promptText: string
  onPlayerSelected: (playerId: PlayerId) => void
  onTimeout: () => void
  onAdultPick: () => void
}

export function OracleScreen({ players, promptText, onPlayerSelected, onTimeout, onAdultPick }: OracleScreenProps) {
  // 最初の1タッチ以降を完全に無視するロックフラグ。state は非同期更新なので使えない。
  const lockRef = useRef(false)

  useEffect(() => {
    lockRef.current = false
    const timer = setTimeout(() => {
      if (lockRef.current) return
      lockRef.current = true
      onTimeout()
    }, TIMEOUT_MS)
    return () => clearTimeout(timer)
    // onTimeout はマウント時点のものを使い続ける（タイムアウトは1回きりの挙動でよい）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePointerDown = (playerId: PlayerId) => {
    if (lockRef.current) return
    lockRef.current = true
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(60)
    }
    onPlayerSelected(playerId)
  }

  const handleAdultPick = () => {
    if (lockRef.current) return
    lockRef.current = true
    onAdultPick()
  }

  const cols = columnsFor(players.length)

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Box style={{ textAlign: 'center', padding: '12px 16px 4px' }}>
        <Text size="sm" c="dimmed">
          {promptText}
        </Text>
        <Text size="xs" c="red.4" mt={2}>
          ⚠️ 口に入れないよう見守ってください
        </Text>
      </Box>

      <Box
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 10,
          padding: 10,
          touchAction: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {players.map((player, index) => (
          <button
            key={player.id}
            type="button"
            aria-label="タップして選ぶ"
            onPointerDown={() => handlePointerDown(player.id)}
            className="blob-pulse"
            style={{
              aspectRatio: '1',
              width: '100%',
              borderRadius: '50%',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              background: colorOf(player.colorIndex),
              animationDelay: `${(index % 8) * 0.17}s`,
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        ))}
      </Box>

      <Box style={{ textAlign: 'center', padding: '4px 8px 10px' }}>
        <UnstyledButton onClick={handleAdultPick} style={{ opacity: 0.45 }}>
          <Text size="xs">大人が選ぶ</Text>
        </UnstyledButton>
      </Box>
    </Box>
  )
}
