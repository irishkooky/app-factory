// 訪問者ごとに専用の DB を割り当てるための目印（cookie）

export const SID_COOKIE = 'sqlb_sid'
const SID_RE = new RegExp(`(?:^|;\\s*)${SID_COOKIE}=([0-9a-f-]{36})(?:;|$)`)

export function readSid(cookieHeader: string | null): string | null {
  return cookieHeader?.match(SID_RE)?.[1] ?? null
}

export function sidCookie(sid: string): string {
  return `${SID_COOKIE}=${sid}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Secure; SameSite=Lax`
}
