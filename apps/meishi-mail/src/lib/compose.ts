import type { MailDraft } from './types'

export type Platform = 'ios' | 'android' | 'desktop'

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  // iPadOS は Mac を名乗るのでタッチ対応で見分ける
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

const enc = encodeURIComponent

/** iOS の Gmail アプリの作成画面。閉じると下書き保存を選べる */
export function gmailAppUrl(to: string, d: MailDraft): string {
  return `googlegmail:///co?to=${enc(to)}&subject=${enc(d.subject)}&body=${enc(d.body)}`
}

/** PC 向け Gmail Web の作成画面。開いた時点で下書きとして自動保存される */
export function gmailWebUrl(to: string, d: MailDraft): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(d.subject)}&body=${enc(d.body)}`
}

/** 端末の既定メールアプリ。Android では通常 Gmail が開く */
export function mailtoUrl(to: string, d: MailDraft): string {
  const body = d.body.replace(/\r?\n/g, '\r\n')
  return `mailto:${enc(to)}?subject=${enc(d.subject)}&body=${enc(body)}`
}
