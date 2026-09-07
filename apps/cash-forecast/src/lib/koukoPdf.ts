import type { PdfImportRow } from './pdfImportTypes'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export const MAX_PDF_BYTES = 10 * 1024 * 1024
export const MAX_PDF_PAGES = 10
export const MAX_IMPORT_ROWS = 360

export function validatePdfFile(file: File) {
  if (file.size > MAX_PDF_BYTES) throw new Error('PDFは10MB以下を選んでください。')
  if (file.type && file.type !== 'application/pdf') throw new Error('PDFファイルを選んでください。')
}

type TextItem = { str: string; transform?: number[]; width?: number }
export type KoukoTextPage = { page: number; items: TextItem[] }

export type ParsedKoukoPdf = {
  rows: PdfImportRow[]
  loanKey: string
  era: '令和' | '平成'
  warnings: string[]
}

const compact = (value: string) => value.replace(/[\s,，]/g, '')
const yen = (value: string) => Number(compact(value).replace(/円$/, ''))

export function warekiToIso(era: '令和' | '平成', year: number, month: number, day: number): string {
  const western = year + (era === '令和' ? 2018 : 1988)
  const date = new Date(Date.UTC(western, month - 1, day))
  if (date.getUTCFullYear() !== western || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`存在しない日付です: ${era}${year}年${month}月${day}日`)
  }
  return `${western}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function reconstructLines(items: TextItem[]): string[] {
  const positioned = items
    .filter((item) => item.str.trim())
    .map((item, index) => ({
      text: item.str.trim(),
      x: item.transform?.[4] ?? index * 10,
      y: item.transform?.[5] ?? 0,
    }))
    .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x)

  const rows: Array<{ y: number; parts: Array<{ x: number; text: string }> }> = []
  for (const item of positioned) {
    let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2)
    if (!row) {
      row = { y: item.y, parts: [] }
      rows.push(row)
    }
    if (!row.parts.some((part) => Math.abs(part.x - item.x) < 0.5 && part.text === item.text)) {
      row.parts.push({ x: item.x, text: item.text })
    }
  }
  return rows.map((row) => row.parts.sort((a, b) => a.x - b.x).map((part) => compact(part.text)).join(' '))
}

function parseDate(value: string, fallbackEra: '令和' | '平成') {
  const match = value.match(/(?:(令和|平成)\s*)?(元|\d{1,2})\s*[年.\/\-]\s*(\d{1,2})\s*[月.\/\-]\s*(\d{1,2})\s*日?/)
  if (!match) return null
  return {
    date: warekiToIso((match[1] as '令和' | '平成' | undefined) ?? fallbackEra, match[2] === '元' ? 1 : Number(match[2]), Number(match[3]), Number(match[4])),
    end: (match.index ?? 0) + match[0].length,
  }
}

/** PDF.js の位置付き文字列から、公庫の返済予定行をfail-closedで抽出する。 */
export function parseKoukoTextPages(pages: KoukoTextPage[], preferredEra: '令和' | '平成' = '令和'): ParsedKoukoPdf {
  if (pages.length === 0 || pages.every((page) => page.items.every((item) => !item.str.trim()))) {
    throw new Error('文字を読み取れませんでした。画像だけのPDFには対応していません。')
  }
  const allText = pages.flatMap((page) => page.items.map((item) => item.str)).join(' ')
  const compactText = compact(allText)
  if (!/(日本政策金融公庫|国民生活事業|お支払額明細)/.test(compactText)) {
    throw new Error('日本政策金融公庫のお支払額明細書として確認できませんでした。')
  }
  const explicitEra = compactText.match(/(令和|平成)(?:元|\d{1,2})年/)?.[1] as '令和' | '平成' | undefined
  const era = explicitEra ?? preferredEra
  const loanMatch = compactText.match(/(?:融資番号|取引番号|お取引番号)[:：]?([\d-]{4,30})/)
  const loanKey = loanMatch?.[1] ?? ''
  const rows: PdfImportRow[] = []
  const rejected: string[] = []

  for (const page of pages) {
    for (const line of reconstructLines(page.items)) {
      const parsedDate = parseDate(line, era)
      const installmentMatch = line.match(/^\s*(\d{1,3})\s*(?:回|回目)?\s+/)
      const remainder = parsedDate ? line.slice(parsedDate.end).trim() : ''
      // 日付に続いて複数の金額らしい列がある行は明細候補。回数が壊れていても黙って捨てない。
      const isDetailCandidate = parsedDate !== null && (remainder.match(/[\d,，-]+/g)?.length ?? 0) >= 3
      if (!installmentMatch) {
        if (isDetailCandidate) rejected.push(`p.${page.page}: 返済回数を読み取れません: ${line.slice(0, 80)}`)
        continue
      }
      // 列順は「支払総額・元金・利息・支払後残高・日割日数」。列を飛ばして後続値を採用しない。
      const columns = remainder.match(/^([\d,，]+)\s+([\d,，]+)\s+(-?[\d,，]+)(?:\s+[\d,，]+\s+\d+)?\s*$/)
      // 列順は「支払総額・元金・利息・支払後残高・日割日数」。日付直後の先頭3列だけを使う。
      if (!parsedDate || !columns) {
        rejected.push(`p.${page.page}: 金額の内訳を読み取れません: ${line.slice(0, 80)}`)
        continue
      }
      const [amount, principal, interest] = columns.slice(1, 4).map(yen)
      if (![principal, interest, amount].every(Number.isSafeInteger) || principal < 0 || interest < 0 || principal + interest !== amount) {
        rejected.push(`p.${page.page}: 金額の内訳が一致しません`)
        continue
      }
      rows.push({ installment: Number(installmentMatch[1]), sourceDate: parsedDate.date, date: parsedDate.date, name: '日本政策金融公庫 返済', principal, interest, amount, page: page.page })
    }
  }
  if (rejected.length > 0) throw new Error(`読み取れない明細行があります（${rejected.length}件）。一部だけの取込はできません。${rejected[0]}`)
  if (rows.length === 0) throw new Error('返済予定の明細行を見つけられませんでした。PDFの書式を確認してください。')
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`明細は${MAX_IMPORT_ROWS}件まで取り込めます。`)
  const installments = rows.map((row) => row.installment)
  if (new Set(installments).size !== installments.length || installments.some((value, index) => index > 0 && value !== installments[index - 1] + 1)) {
    throw new Error('返済回数に欠落または重複があります。一部だけの取込はできません。')
  }
  return { rows, loanKey, era, warnings: loanKey ? [] : ['融資識別子を自動判定できませんでした。入力して確認してください。'] }
}

export async function readKoukoPdf(file: File, signal?: AbortSignal): Promise<ParsedKoukoPdf> {
  validatePdfFile(file)
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const loadingTask = pdfjs.getDocument({ data: bytes })
  signal?.addEventListener('abort', () => void loadingTask.destroy(), { once: true })
  try {
    const pdf = await loadingTask.promise
    if (pdf.numPages > MAX_PDF_PAGES) throw new Error(`PDFは${MAX_PDF_PAGES}ページまで取り込めます。`)
    const pages: KoukoTextPage[] = []
    for (let number = 1; number <= pdf.numPages; number += 1) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      pages.push({ page: number, items: content.items.filter((item): item is TextItem & typeof item => 'str' in item) })
      page.cleanup()
    }
    return parseKoukoTextPages(pages)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/password/i.test(message)) throw new Error('パスワードで保護されたPDFには対応していません。')
    if (/InvalidPDF|MissingPDF|UnexpectedResponse/i.test(message)) throw new Error('PDFが壊れているか、対応していない形式です。')
    throw error
  } finally {
    await loadingTask.destroy()
  }
}

export async function sha256File(file: File): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
