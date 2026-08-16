import { createServerFn } from '@tanstack/react-start'
import { CATALOG } from '../data/catalog'

export type LivenessStatus = 'up' | 'down'
export type LivenessResult = {
  checkedAt: string
  results: Record<string, LivenessStatus>
}

const TTL_MS = 60_000
const FETCH_TIMEOUT_MS = 4000

let cache: { checkedAt: number; data: LivenessResult } | null = null

/** 1件のURLを疎通確認する。例外・非2xxはすべて 'down' 扱いにする */
async function pingUrl(url: string): Promise<LivenessStatus> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    try {
      // レスポンスボディは使わないので読まずに捨てる
      await res.body?.cancel()
    } catch {
      // ボディの破棄に失敗しても判定には影響させない
    }
    return res.ok ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

/**
 * apps/ 一覧の稼働状況をチェックするサーバー関数。
 * 未デプロイのアプリは fetch せず即 down にする。
 * どのURLが落ちていても Promise.allSettled で全体は必ず成功して返る。
 * isolate 単位のメモリキャッシュ（TTL 60秒）を持つ。
 */
export const checkLiveness = createServerFn({ method: 'GET' }).handler(async (): Promise<LivenessResult> => {
  const now = Date.now()
  if (cache && now - cache.checkedAt < TTL_MS) {
    return cache.data
  }

  const results: Record<string, LivenessStatus> = {}

  const settled = await Promise.allSettled(
    CATALOG.map(async (item) => {
      if (!item.deployed) {
        return { slug: item.slug, status: 'down' as LivenessStatus }
      }
      const status = await pingUrl(item.url)
      return { slug: item.slug, status }
    }),
  )

  for (let i = 0; i < CATALOG.length; i++) {
    const slug = CATALOG[i].slug
    const outcome = settled[i]
    results[slug] = outcome.status === 'fulfilled' ? outcome.value.status : 'down'
  }

  const data: LivenessResult = {
    checkedAt: new Date(now).toISOString(),
    results,
  }
  cache = { checkedAt: now, data }
  return data
})
