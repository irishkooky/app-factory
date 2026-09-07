import { describe, expect, it } from 'vitest'
import { parseKoukoTextPages, warekiToIso, type KoukoTextPage } from './koukoPdf'

const page = (lines: string[], number = 1): KoukoTextPage => ({
  page: number,
  items: lines.flatMap((line, row) => line.split(' ').map((str, col) => ({ str, transform: [1, 0, 0, 1, col * 80, 800 - row * 20] }))),
})

describe('parseKoukoTextPages', () => {
  it('複数ページの連続明細を抽出しヘッダー金額を除外する', () => {
    const result = parseKoukoTextPages([
      page(['日本政策金融公庫 お支払額明細 融資番号：1234-5678', '融資金額 6,000,000 円', '1 回 令和8年7月31日 87,077 75,000 12,077 5,850,000 31']),
      page(['2 回 令和8年8月31日 86,924 75,000 11,924 5,775,000 31'], 2),
    ])
    expect(result.loanKey).toBe('1234-5678')
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toMatchObject({ sourceDate: '2026-07-31', principal: 75000, interest: 12077, amount: 87077 })
  })
  it('明細の欠落と内訳不一致を拒否する', () => {
    expect(() => parseKoukoTextPages([page(['日本政策金融公庫 お支払額明細', '1 回 令和8年7月31日 76,000 75,000 1,000', '3 回 令和8年9月30日 75,900 75,000 900'])])).toThrow('欠落')
    expect(() => parseKoukoTextPages([page(['日本政策金融公庫 お支払額明細', '1 回 令和8年7月31日 99,000 75,000 1,000'])])).toThrow('内訳')
  })
  it('回数が壊れた明細候補と負の金額を拒否する', () => {
    expect(() => parseKoukoTextPages([page(['日本政策金融公庫 お支払額明細', 'X 回 令和8年8月31日 86,924 75,000 11,924'])])).toThrow('返済回数')
    expect(() => parseKoukoTextPages([page(['日本政策金融公庫 お支払額明細', '1 回 令和8年8月31日 86,924 75,000 -11,924 11,924'])])).toThrow('内訳')
  })
  it('空・別書式を拒否する', () => {
    expect(() => parseKoukoTextPages([])).toThrow('文字を読み取れません')
    expect(() => parseKoukoTextPages([page(['請求書'])])).toThrow('確認できません')
  })
})

describe('warekiToIso', () => {
  it('元号と閏年を変換する', () => expect(warekiToIso('令和', 8, 2, 28)).toBe('2026-02-28'))
  it('不正な日付を拒否する', () => expect(() => warekiToIso('令和', 7, 2, 29)).toThrow('存在しない'))
  it('平成も変換する', () => expect(warekiToIso('平成', 31, 4, 30)).toBe('2019-04-30'))
})
