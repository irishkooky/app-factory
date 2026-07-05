import type { ClothingItem } from '../types'

const STORAGE_KEY = 'tokyo-outfit:items'

export function loadItems(): ClothingItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as ClothingItem[]
  } catch {
    return []
  }
}

export function saveItems(items: ClothingItem[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
      throw new Error('容量がいっぱいです。画像サイズの大きいアイテムを削除してから、もう一度お試しください。')
    }
    throw err
  }
}

export function addItem(item: ClothingItem): ClothingItem[] {
  const items = loadItems()
  const next = [...items, item]
  saveItems(next)
  return next
}

export function removeItem(id: string): ClothingItem[] {
  const items = loadItems()
  const next = items.filter((item) => item.id !== id)
  saveItems(next)
  return next
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
