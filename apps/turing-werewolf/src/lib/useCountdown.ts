import { useEffect, useState } from 'react'

/**
 * deadlineAt（ms epoch）までの残り秒数を1秒ごとに更新して返す。
 * deadlineAt が未設定なら null（表示しない）。0未満にはならない（0で止まる）。
 * 遷移そのものはサーバー（forceAdvance等）が行うので、これは表示専用。
 */
export function useCountdownSeconds(deadlineAt: number | undefined): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    deadlineAt === undefined ? null : deadlineAt - Date.now(),
  )

  useEffect(() => {
    if (deadlineAt === undefined) {
      setRemainingMs(null)
      return
    }
    setRemainingMs(deadlineAt - Date.now())
    const intervalId = setInterval(() => {
      setRemainingMs(deadlineAt - Date.now())
    }, 1000)
    return () => clearInterval(intervalId)
  }, [deadlineAt])

  if (remainingMs === null) return null
  return Math.max(0, Math.ceil(remainingMs / 1000))
}
