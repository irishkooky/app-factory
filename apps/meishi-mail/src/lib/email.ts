const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

/** 全角記号や空白を正規化する。名刺の OCR では「＠」やスペース混じりがよくある */
export function normalizeEmail(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/^mailto:/i, '')
    .replace(/[。、,;:]+$/, '')
    .trim()
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

/** 正規化して妥当なものだけを重複なしで返す */
export function cleanEmails(raws: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of raws) {
    const email = normalizeEmail(raw)
    const key = email.toLowerCase()
    if (!isValidEmail(email) || seen.has(key)) continue
    seen.add(key)
    out.push(email)
  }
  return out
}
