import type { Session } from './types'

const KEY = 'akachan-party:v1'

function isValidSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>

  if (!Array.isArray(v.players)) return false
  const playersValid = v.players.every((p) => {
    if (!p || typeof p !== 'object') return false
    const player = p as Record<string, unknown>
    return (
      typeof player.id === 'string' &&
      typeof player.name === 'string' &&
      Number.isFinite(player.colorIndex) &&
      Number.isFinite(player.score)
    )
  })
  if (!playersValid) return false

  if (typeof v.babyName !== 'string') return false
  if (typeof v.useBaby !== 'boolean') return false
  if (!Number.isFinite(v.round)) return false

  return true
}

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveSession(s: Session): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // 保存に失敗しても無視する（プライベートブラウジング等）
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // 無視する
  }
}
