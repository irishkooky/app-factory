import type { HistoryEntry, SenderProfile } from './types'

const PROFILE_KEY = 'meishi-mail:profile'
const HISTORY_KEY = 'meishi-mail:history'
const HISTORY_MAX = 100

export const DEFAULT_PROFILE: SenderProfile = {
  name: '',
  company: '',
  signature: '',
  eventName: '経営者交流会',
}

function read<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // プライベートモードなどで保存できなくても動作は続ける
  }
}

export function loadProfile(): SenderProfile {
  return { ...DEFAULT_PROFILE, ...read<Partial<SenderProfile>>(PROFILE_KEY) }
}

export function saveProfile(profile: SenderProfile): void {
  write(PROFILE_KEY, profile)
}

export function loadHistory(): HistoryEntry[] {
  const list = read<HistoryEntry[]>(HISTORY_KEY)
  return Array.isArray(list) ? list : []
}

export function saveHistory(list: HistoryEntry[]): void {
  write(HISTORY_KEY, list.slice(0, HISTORY_MAX))
}
