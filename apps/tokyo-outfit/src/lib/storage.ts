import type { Category, ClothingItem, ItemColor } from '../types'
import { addItem as addItemFn, deleteItem as deleteItemFn, listItems as listItemsFn } from '../server/items'

const LEGACY_STORAGE_KEY = 'tokyo-outfit:items'

interface LegacyClothingItem {
  id: string
  name: string
  category: Category
  warmth: number
  color: ItemColor
  imageDataUrl?: string
  createdAt: number
}

export interface AddItemInput {
  meta: {
    name: string
    category: Category
    warmth: number
    color: ItemColor
  }
  imageDataUrl?: string
  /** 移行用: 指定時はサーバー側でこのIDのまま保存される（KVは同キー上書きなので再試行が冪等） */
  id?: string
  /** 移行用: 指定時はこの作成日時が維持される */
  createdAt?: number
}

/** サーバー（Workers KV）から登録済みの服を取得する */
export async function listItems(): Promise<ClothingItem[]> {
  return listItemsFn()
}

/** 服を1着追加する。サーバーが採番したメタ情報を返す */
export async function addItem(input: AddItemInput): Promise<ClothingItem> {
  return addItemFn({ data: input })
}

/** 服を削除する */
export async function removeItem(id: string): Promise<void> {
  await deleteItemFn({ data: { id } })
}

function readLegacyItems(): LegacyClothingItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as LegacyClothingItem[]
  } catch {
    return []
  }
}

/** 旧バージョン（localStorage保存）のデータが残っているかどうか */
export function hasLegacyItems(): boolean {
  return readLegacyItems().length > 0
}

/**
 * 旧バージョン（localStorage保存）のデータをサーバー（KV）へ自動移行する。
 * 旧アイテムの `id`・`createdAt` をそのまま渡すため、途中失敗→再試行しても
 * 同じKVキーへの上書きになり重複登録されない（冪等）。
 * 移行後はlocalStorageの旧キーを削除する。既に移行済み・データが無い場合は何もしない。
 * 戻り値: 移行した件数
 */
export async function migrateLegacyItems(): Promise<number> {
  const legacyItems = readLegacyItems()
  if (legacyItems.length === 0) return 0

  for (const item of legacyItems) {
    await addItem({
      meta: {
        name: item.name,
        category: item.category,
        warmth: item.warmth,
        color: item.color,
      },
      imageDataUrl: item.imageDataUrl,
      id: item.id,
      createdAt: item.createdAt,
    })
  }

  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  return legacyItems.length
}

/**
 * 画像ファイルを長辺512pxに縮小し、JPEG(quality 0.7) の data URL に圧縮する。
 */
export async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const maxSide = 512
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('画像の処理に失敗しました')
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.7)
  } finally {
    bitmap.close()
  }
}
