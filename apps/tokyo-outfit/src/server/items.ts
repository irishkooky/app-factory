import { createServerFn } from '@tanstack/react-start'
import { CATEGORIES, COLORS, type Category, type ClothingItem, type ItemColor } from '../types'

const ITEM_PREFIX = 'item:'
const IMG_PREFIX = 'img:'

const NAME_MAX_LENGTH = 100
const IMAGE_DATA_URL_MAX_LENGTH = 2_000_000
const UUID_PATTERN = /^[0-9a-f-]{36}$/i

interface ItemMetaInput {
  name: string
  category: Category
  warmth: number
  color: ItemColor
}

export interface AddItemInput {
  meta: ItemMetaInput
  imageDataUrl?: string
  /** 移行用: 指定時はこのIDで保存する（KVのputは同キー上書きなので再試行が冪等になる） */
  id?: string
  /** 移行用: 指定時はこの作成日時を維持する */
  createdAt?: number
}

/** addItem の入力を実行時に検証する。公開エンドポイントのため不正入力は Error で拒否する */
function validateAddItemInput(data: AddItemInput): AddItemInput {
  const input: unknown = data
  if (!input || typeof input !== 'object') {
    throw new Error('不正なリクエストです')
  }
  const record = input as Record<string, unknown>

  if (!record.meta || typeof record.meta !== 'object') {
    throw new Error('不正なリクエストです（meta がありません）')
  }
  const m = record.meta as Record<string, unknown>

  if (typeof m.name !== 'string') {
    throw new Error('名前が不正です')
  }
  const name = m.name.trim()
  if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
    throw new Error(`名前は1〜${NAME_MAX_LENGTH}文字で入力してください`)
  }

  if (typeof m.category !== 'string' || !(CATEGORIES as readonly string[]).includes(m.category)) {
    throw new Error('カテゴリが不正です')
  }

  if (typeof m.color !== 'string' || !(COLORS as readonly string[]).includes(m.color)) {
    throw new Error('色が不正です')
  }

  if (typeof m.warmth !== 'number' || !Number.isInteger(m.warmth) || m.warmth < 1 || m.warmth > 5) {
    throw new Error('暖かさは1〜5の整数で指定してください')
  }

  let imageDataUrl: string | undefined
  if (record.imageDataUrl !== undefined) {
    if (typeof record.imageDataUrl !== 'string' || !record.imageDataUrl.startsWith('data:image/')) {
      throw new Error('画像データが不正です')
    }
    if (record.imageDataUrl.length > IMAGE_DATA_URL_MAX_LENGTH) {
      throw new Error('画像データが大きすぎます')
    }
    imageDataUrl = record.imageDataUrl
  }

  let id: string | undefined
  if (record.id !== undefined) {
    if (typeof record.id !== 'string' || !UUID_PATTERN.test(record.id)) {
      throw new Error('IDが不正です')
    }
    id = record.id
  }

  let createdAt: number | undefined
  if (record.createdAt !== undefined) {
    if (typeof record.createdAt !== 'number' || !Number.isFinite(record.createdAt) || record.createdAt <= 0) {
      throw new Error('作成日時が不正です')
    }
    createdAt = record.createdAt
  }

  return {
    meta: {
      name,
      category: m.category as Category,
      warmth: m.warmth,
      color: m.color as ItemColor,
    },
    imageDataUrl,
    id,
    createdAt,
  }
}

/**
 * data URL（"data:image/jpeg;base64,...")をバイナリに変換する。
 * Workers上で動くAPI（atob + Uint8Array）のみを使用し、Node の Buffer は使わない。
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(',')
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function isClothingItem(value: unknown): value is ClothingItem {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.category === 'string' &&
    typeof v.warmth === 'number' &&
    typeof v.color === 'string' &&
    typeof v.hasImage === 'boolean' &&
    typeof v.createdAt === 'number'
  )
}

/** 登録済みの服を一覧取得する（作成日時の降順） */
export const listItems = createServerFn({ method: 'GET' }).handler(async (): Promise<ClothingItem[]> => {
  const { env } = await import('cloudflare:workers')

  const list = await env.CLOSET_KV.list({ prefix: ITEM_PREFIX })
  const entries = await Promise.all(
    list.keys.map(async (key) => {
      try {
        const raw = await env.CLOSET_KV.get(key.name)
        if (!raw) return null
        const parsed: unknown = JSON.parse(raw)
        return isClothingItem(parsed) ? parsed : null
      } catch {
        // 壊れたエントリはスキップする（防御的）
        return null
      }
    }),
  )

  return entries
    .filter((item): item is ClothingItem => item !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
})

/**
 * 服を1着追加する。画像があれば img:<id> に、メタ情報を item:<id> に保存する。
 * `id`/`createdAt` が指定された場合はそれを使う（localStorageからの移行を冪等にするため）。
 */
export const addItem = createServerFn({ method: 'POST' })
  .validator(validateAddItemInput)
  .handler(async ({ data }): Promise<ClothingItem> => {
    const { env } = await import('cloudflare:workers')

    const id = data.id ?? crypto.randomUUID()
    const createdAt = data.createdAt ?? Date.now()
    const hasImage = Boolean(data.imageDataUrl)

    if (data.imageDataUrl) {
      const bytes = dataUrlToBytes(data.imageDataUrl)
      await env.CLOSET_KV.put(IMG_PREFIX + id, bytes)
    }

    const item: ClothingItem = {
      id,
      name: data.meta.name,
      category: data.meta.category,
      warmth: data.meta.warmth,
      color: data.meta.color,
      hasImage,
      createdAt,
    }

    await env.CLOSET_KV.put(ITEM_PREFIX + id, JSON.stringify(item))
    return item
  })

/** 服を削除する（メタ・画像の両方） */
export const deleteItem = createServerFn({ method: 'POST' })
  .validator((data: { id: string }): { id: string } => {
    const input: unknown = data
    if (!input || typeof input !== 'object') {
      throw new Error('不正なリクエストです')
    }
    const { id } = input as Record<string, unknown>
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('IDが不正です')
    }
    return { id }
  })
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { env } = await import('cloudflare:workers')

    await Promise.all([env.CLOSET_KV.delete(ITEM_PREFIX + data.id), env.CLOSET_KV.delete(IMG_PREFIX + data.id)])

    return { id: data.id }
  })
