const STORAGE_KEY = 'tw-device-id'

/**
 * 端末ごとの匿名ID。localStorageに保存し、ミューテーション引数で渡す。
 * ログイン不要・サーバー側での「自分の役職を問い合わせる関数」は存在しない前提の唯一の識別子。
 *
 * SSRでは window が無いため呼び出さないこと（クライアント側の useState 初期化子や
 * useEffect でのみ使用する）。
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    throw new Error('getDeviceId はクライアント側でのみ呼び出せます。')
  }

  const existing = window.localStorage.getItem(STORAGE_KEY)
  if (existing) return existing

  const created = crypto.randomUUID()
  window.localStorage.setItem(STORAGE_KEY, created)
  return created
}
