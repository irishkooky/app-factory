import { isCurated, layoutSeal, sealFor } from './domain.ts'

function check(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
  }
}

const HEARD: Record<string, string> = {
  Priya: 'プリヤ',
  Rahul: 'ラフル',
  Arjun: 'アルジュン',
  Aisha: 'アイシャ',
  Krishna: 'クリシュナ',
  Sneha: 'スネハ',
  Vikram: 'ビクラム',
  Ananya: 'アナニャ',
  Deepak: 'ディーパク',
  Meera: 'ミーラ',
  Yoshihiro: 'ヨシヒロ',
  Kurosaki: 'クロサキ',
  Aditi: 'アディティ',
  Rohan: 'ロハン',
  Neha: 'ネハ',
  Amit: 'アミト',
  Pooja: 'プージャ',
  Sanjay: 'サンジャイ',
  Lakshmi: 'ラクシュミ',
  Isha: 'イシャ',
  Raj: 'ラジ',
  Singh: 'シング',
}

for (const [name, reading] of Object.entries(HEARD)) {
  const result = sealFor(name)
  if (!result.ok) throw new Error(`${name} should produce a seal`)
  check(name, result.seal.reading, reading)
  for (const glyph of result.seal.glyphs) {
    if (!isCurated(glyph.reading)) throw new Error(`${name} used an uncurated mora ${glyph.reading}`)
    if (glyph.kanji.length === 0 || glyph.meaning.length === 0) throw new Error(`${name} has an empty glyph`)
  }
}

const full = sealFor('Yoshihiro Kurosaki')
if (!full.ok) throw new Error('two names should produce a seal')
check('two names', full.seal.reading, 'ヨシヒロ クロサキ')

const again = sealFor('Priya')
const once = sealFor('Priya')
if (!again.ok || !once.ok) throw new Error('Priya should produce a seal')
check('stable kanji', again.seal.glyphs.map((glyph) => glyph.kanji).join(''), once.seal.glyphs.map((glyph) => glyph.kanji).join(''))

const shifted = sealFor('Priya', [1])
if (!shifted.ok) throw new Error('shifted Priya should produce a seal')
if (shifted.seal.glyphs[0]?.kanji === once.seal.glyphs[0]?.kanji) {
  throw new Error('shifting the first mora should change its kanji')
}
check('shift keeps reading', shifted.seal.reading, 'プリヤ')
check('shift keeps later kanji', shifted.seal.glyphs[1]?.kanji, once.seal.glyphs[1]?.kanji)

check('empty', sealFor('   ').ok, false)
check('no letters', sealFor('!!!').ok, false)

const narrow = layoutSeal(['普', '里', '弥'])
check('three columns', narrow.cols, 1)
check('three share x', narrow.chars[0]?.x, narrow.chars[1]?.x)
if ((narrow.chars[0]?.y ?? 0) >= (narrow.chars[1]?.y ?? 0)) throw new Error('a short name reads top to bottom')

const wide = layoutSeal(['普', '里', '弥', '花', '希'])
check('five columns', wide.cols, 2)
if ((wide.chars[0]?.x ?? 0) <= (wide.chars[3]?.x ?? 0)) {
  throw new Error('the first mora sits in the right-hand column')
}

console.log('kanji-name domain ok')
