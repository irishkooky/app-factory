import { COLOR_LABELS, type ClothingItem, type ItemColor, type Outfit } from '../types'
import type { TempBand } from './weather'

const NEUTRALS: ItemColor[] = ['white', 'black', 'gray', 'navy', 'beige', 'brown', 'denim']

// 補色的な相性が良いとされる色の組み合わせ（順不同で判定）
const COMPLEMENTARY_PAIRS: [ItemColor, ItemColor][] = [
  ['navy', 'beige'],
  ['denim', 'white'],
  ['black', 'red'],
  ['navy', 'white'],
  ['brown', 'beige'],
  ['gray', 'pink'],
  ['denim', 'brown'],
  ['black', 'yellow'],
  ['navy', 'orange'],
  ['white', 'blue'],
]

function isNeutral(color: ItemColor): boolean {
  return NEUTRALS.includes(color)
}

function isComplementaryPair(a: ItemColor, b: ItemColor): boolean {
  return COMPLEMENTARY_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

/** 2色の相性ボーナスを計算する */
function colorBonus(a: ItemColor, b: ItemColor): number {
  let bonus = 0
  const aNeutral = isNeutral(a)
  const bNeutral = isNeutral(b)
  if (aNeutral || bNeutral) bonus += 3
  if (aNeutral && bNeutral) bonus += 2
  if (a === b && !aNeutral) bonus -= 2
  if (isComplementaryPair(a, b)) bonus += 2
  return bonus
}

/** 気温適合度をベースにしたスコア。ランダム項を加えて再抽選のたびに変化を持たせる */
function warmthScore(item: ClothingItem, targetWarmth: number): number {
  return -Math.abs(item.warmth - targetWarmth) * 10 + Math.random() * 4
}

function pickBest<T>(candidates: T[], scoreFn: (item: T) => number): T | undefined {
  if (candidates.length === 0) return undefined
  let best = candidates[0]
  let bestScore = scoreFn(best)
  for (let i = 1; i < candidates.length; i++) {
    const item = candidates[i]
    const score = scoreFn(item)
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  return best
}

function generateComment(params: {
  tops: ClothingItem
  bottoms: ClothingItem
  outer?: ClothingItem
  band: TempBand
}): string {
  const { tops, bottoms, outer, band } = params
  const mainColor = outer?.color ?? tops.color
  const subColor = bottoms.color
  const mainLabel = COLOR_LABELS[mainColor]
  const subLabel = COLOR_LABELS[subColor]

  const patterns: string[] = []
  if (isComplementaryPair(mainColor, subColor)) {
    patterns.push(`${mainLabel}×${subLabel}の相性抜群な組み合わせ。今日の気温にもぴったりです。`)
  }
  if (isNeutral(mainColor) && isNeutral(subColor)) {
    patterns.push(`${mainLabel}×${subLabel}の王道きれいめ配色。合わせやすく安心感があります。`)
  }
  if (mainColor === subColor && !isNeutral(mainColor)) {
    patterns.push(`${mainLabel}のワントーンでまとめた、こなれた印象のコーデです。`)
  }
  if (patterns.length === 0) {
    patterns.push(`${mainLabel}×${subLabel}の組み合わせ。${band.label}にちょうど良いスタイルです。`)
  }
  patterns.push(`${band.label}にふさわしい、動きやすく快適なコーデです。`)

  return patterns[Math.floor(Math.random() * patterns.length)]
}

/**
 * 手持ちの服から気温帯に合ったコーディネートを提案する。
 * tops・bottoms のいずれかが1着も無ければ null（呼び出し側は空状態を表示する）。
 */
export function suggestOutfit(items: ClothingItem[], band: TempBand): Outfit | null {
  const tops = items.filter((item) => item.category === 'tops')
  const bottoms = items.filter((item) => item.category === 'bottoms')
  const outers = items.filter((item) => item.category === 'outer')
  const accessories = items.filter((item) => item.category === 'accessory')

  if (tops.length === 0 || bottoms.length === 0) {
    return null
  }

  const chosenTops = pickBest(tops, (item) => warmthScore(item, band.topsWarmth))!

  const chosenBottoms = pickBest(
    bottoms,
    (item) => warmthScore(item, band.bottomsWarmth) + colorBonus(item.color, chosenTops.color),
  )!

  const outerTargetWarmth = band.outerWarmth ?? 3
  const scoreOuter = (item: ClothingItem) =>
    warmthScore(item, outerTargetWarmth) + colorBonus(item.color, chosenTops.color) + colorBonus(item.color, chosenBottoms.color)

  let chosenOuter: ClothingItem | undefined
  if (band.outerNeed === 'required') {
    if (outers.length > 0) {
      chosenOuter = pickBest(outers, scoreOuter)
    }
    // 手持ちが無ければ省略。UI側で「アウターが登録されていません」の注意を表示する。
  } else if (band.outerNeed === 'optional') {
    if (outers.length > 0 && Math.random() < 0.5) {
      chosenOuter = pickBest(outers, scoreOuter)
    }
  }

  let chosenAccessory: ClothingItem | undefined
  if (accessories.length > 0 && Math.random() < 0.3) {
    chosenAccessory = pickBest(
      accessories,
      (item) => Math.random() * 4 + colorBonus(item.color, chosenTops.color) + colorBonus(item.color, chosenBottoms.color),
    )
  }

  const keyItem = chosenOuter ?? chosenTops

  const comment = generateComment({ tops: chosenTops, bottoms: chosenBottoms, outer: chosenOuter, band })

  return {
    outer: chosenOuter,
    tops: chosenTops,
    bottoms: chosenBottoms,
    accessory: chosenAccessory,
    keyItem,
    comment,
  }
}
