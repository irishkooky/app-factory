import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { CATALOG, type CatalogItem } from '../data/catalog'

export type LivenessStatus = 'up' | 'down'
export type LivenessResult = {
  checkedAt: string
  results: Record<string, LivenessStatus>
}

const TTL_MS = 60_000
const FETCH_TIMEOUT_MS = 4000

let cache: { checkedAt: number; data: LivenessResult } | null = null

type ServiceBinding = { fetch(request: Request): Promise<Response> }

function isServiceBinding(value: unknown): value is ServiceBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fetch' in value &&
    typeof value.fetch === 'function'
  )
}

/**
 * Service Binding を名前で取り出す。存在しない・想定した形でない場合は undefined を返す
 * （例外を投げない）。`env` はここでだけ参照し、モジュールトップレベルでは展開しない。
 *
 * wrangler.jsonc から生成される `Env` 型には（実在するバインディングのみの）具体的な
 * プロパティしかなく index signature が無いため、`Record<string, unknown>` への直接代入は
 * 型エラーになる（`as` によるキャストは仕様上禁止）。`Reflect.get` は object を受け取り
 * 戻り値が `any` なので、`as` を使わずに任意キーの動的参照ができる。
 */
function getBinding(name: string): ServiceBinding | undefined {
  const value: unknown = Reflect.get(env, name)
  return isServiceBinding(value) ? value : undefined
}

/**
 * Service Binding 経由で1件疎通確認する。*.workers.dev への直接 fetch は
 * 本番で `error code: 1042`（同一ゾーンWorker間サブリクエスト禁止）になるため使わない。
 * タイムアウト・例外・非2xxはすべて 'down' 扱いにする。
 */
async function pingViaBinding(binding: ServiceBinding, url: string): Promise<LivenessStatus> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('liveness check timeout')), FETCH_TIMEOUT_MS)
    })
    const response = await Promise.race([binding.fetch(new Request(url)), timeout])
    try {
      // レスポンスボディは使わないので読まずに捨てる
      await response.body?.cancel()
    } catch {
      // ボディの破棄に失敗しても判定には影響させない
    }
    return response.ok ? 'up' : 'down'
  } catch {
    return 'down'
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

/**
 * 1件のアプリの稼働状況を判定する。
 * - 未デプロイ → fetch せず 'down'
 * - Service Binding が割り当てられていない（lab自身・未デプロイ以外の理由で無い等）→ null（結果に載せない）
 * - バインディングが env 上に見つからない（sync後に消えた等）→ null（結果に載せない）
 * - それ以外 → Service Binding 経由で疎通確認
 */
async function checkItem(item: CatalogItem): Promise<LivenessStatus | null> {
  if (!item.deployed) return 'down'
  if (item.binding === null) return null
  const binding = getBinding(item.binding)
  if (binding === undefined) return null
  return pingViaBinding(binding, item.url)
}

/**
 * apps/ 一覧の稼働状況をチェックするサーバー関数。
 * どのアプリが落ちていても・タイムアウトしても Promise.allSettled で全体は必ず成功して返る。
 * isolate 単位のメモリキャッシュ（TTL 60秒）を持つ。
 */
export const checkLiveness = createServerFn({ method: 'GET' }).handler(async (): Promise<LivenessResult> => {
  const now = Date.now()
  if (cache && now - cache.checkedAt < TTL_MS) {
    return cache.data
  }

  const settled = await Promise.allSettled(CATALOG.map((item) => checkItem(item)))

  const results: Record<string, LivenessStatus> = {}
  for (let i = 0; i < CATALOG.length; i++) {
    const slug = CATALOG[i].slug
    const outcome = settled[i]
    if (outcome.status === 'fulfilled') {
      if (outcome.value !== null) {
        results[slug] = outcome.value
      }
      // null（バインディング無し・見つからない）の場合は結果に載せない → UI側で unknown 扱い
    } else {
      // reject したケースは 'down' として扱う（1件の失敗が全体に波及しないようにする）
      results[slug] = 'down'
    }
  }

  const data: LivenessResult = {
    checkedAt: new Date(now).toISOString(),
    results,
  }
  cache = { checkedAt: now, data }
  return data
})
