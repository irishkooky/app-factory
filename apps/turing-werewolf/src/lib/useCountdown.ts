import { useEffect, useState } from 'react'

/**
 * deadlineAt（ms epoch）までの残り秒数を1秒ごとに更新して返す。
 * deadlineAt が未設定なら null（表示しない）。0未満にはならない（0で止まる）。
 * 遷移そのものはサーバー（forceAdvance等）が行うので、これは表示専用。
 *
 * 初期値は常に null にし、useEffect の中でだけ実値をセットする。
 * getRoom はSSRでプリフェッチされるため、useState初期化子で Date.now() を読むと
 * サーバーの時計で焼き込まれた秒数とクライアントの再計算後の秒数がズレて
 * ハイドレーション不一致（React 19ではroot再レンダー）を起こす。
 * null → 実値という遷移はサーバー/クライアントどちらも「まず非表示」で一致する。
 */
export function useCountdownSeconds(deadlineAt: number | undefined): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    if (deadlineAt === undefined) {
      setRemainingMs(null)
      return
    }

    setRemainingMs(deadlineAt - Date.now())
    const intervalId = setInterval(() => {
      const next = deadlineAt - Date.now()
      setRemainingMs(next)
      if (next <= 0) {
        // 残り0になったら数字は変わらないので、毎秒setStateし続けない
        clearInterval(intervalId)
      }
    }, 1000)
    return () => clearInterval(intervalId)
  }, [deadlineAt])

  if (remainingMs === null) return null
  return Math.max(0, Math.ceil(remainingMs / 1000))
}
