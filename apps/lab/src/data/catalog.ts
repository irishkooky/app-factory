import { REGISTRY } from './registry.gen'
import { CATEGORY_ORDER, META, type Category } from './meta'

export type CatalogItem = {
  slug: string
  no: number // 通し番号（1始まり）
  url: string
  title: string
  description: string
  category: Category
  tags: string[]
  deployed: boolean
  createdAt: string | null
  modifiedAt: string | null
  shotUrl: string | null // '/shots/<slug>.jpg' or null
}

const DEFAULT_DESCRIPTION = '説明が未設定のアプリです。'
const DEFAULT_CATEGORY: Category = 'demo'

type MergedEntry = Omit<CatalogItem, 'no'>

/** コードポイント順の比較（`localeCompare` はICU/ロケール依存で環境により結果が揺れるため使わない） */
function compareSlug(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** createdAt 昇順（古い順）。null は末尾。同着は slug 昇順（安定ソート用の比較関数） */
function compareOldestFirst(a: { slug: string; createdAt: string | null }, b: { slug: string; createdAt: string | null }): number {
  if (a.createdAt === null && b.createdAt === null) return compareSlug(a.slug, b.slug)
  if (a.createdAt === null) return 1
  if (b.createdAt === null) return -1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return compareSlug(a.slug, b.slug)
}

/** createdAt 降順（新しい順）。null は末尾。同着は slug 昇順 */
function compareNewestFirst(a: { slug: string; createdAt: string | null }, b: { slug: string; createdAt: string | null }): number {
  if (a.createdAt === null && b.createdAt === null) return compareSlug(a.slug, b.slug)
  if (a.createdAt === null) return 1
  if (b.createdAt === null) return -1
  if (a.createdAt !== b.createdAt) return a.createdAt > b.createdAt ? -1 : 1
  return compareSlug(a.slug, b.slug)
}

// 1. REGISTRY をベースに META をマージする（META に無い slug もフォールバックで必ず出す）
// 2. hidden === true は除外する
// 3. META にあるが REGISTRY に無い slug は無視する（REGISTRY を起点にしているので自然に満たす）
const merged: MergedEntry[] = REGISTRY.filter((entry) => META[entry.slug]?.hidden !== true).map((entry) => {
  const meta = META[entry.slug]
  return {
    slug: entry.slug,
    url: entry.url,
    title: meta?.title ?? entry.slug,
    description: meta?.description ?? DEFAULT_DESCRIPTION,
    category: meta?.category ?? DEFAULT_CATEGORY,
    tags: meta?.tags ?? [],
    deployed: entry.deployed,
    createdAt: entry.createdAt,
    modifiedAt: entry.modifiedAt,
    shotUrl: entry.hasShot ? `/shots/${entry.slug}.jpg` : null,
  }
})

// 4. 通し番号は createdAt 昇順（古い順）で安定して振る
const numberBySlug = new Map<string, number>()
;[...merged]
  .sort(compareOldestFirst)
  .forEach((entry, index) => {
    numberBySlug.set(entry.slug, index + 1)
  })

// 5. デフォルトの並び順は createdAt 降順（新しい順）
export const CATALOG: CatalogItem[] = [...merged].sort(compareNewestFirst).map((entry) => ({
  ...entry,
  no: numberBySlug.get(entry.slug) ?? 0,
}))

export const TOTAL_COUNT: number = CATALOG.length

export const CATEGORY_COUNTS: Record<Category, number> = CATEGORY_ORDER.reduce(
  (acc, category) => {
    acc[category] = CATALOG.filter((item) => item.category === category).length
    return acc
  },
  { tool: 0, game: 0, demo: 0 },
)

export const ACTIVE_CATEGORY_COUNT: number = CATEGORY_ORDER.filter((category) => CATEGORY_COUNTS[category] > 0).length
