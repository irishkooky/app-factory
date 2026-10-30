import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { site, type PhotoNote } from '../site.config'

/**
 * Googleマップ（Places API (New)）から、評価・クチコミ件数・先方が載せた写真を取ってくる。
 * 規約で写真や評価は保存できないので、表示のたびに取り直す。写真の URL は Google の配信 URL をそのまま使う。
 * キーは Worker の secret（GOOGLE_MAPS_API_KEY）。無い・失敗したときは null を返し、画面は写真なしの見た目になる。
 */

export type GooglePhoto = {
  src: string
  width: number
  height: number
  /** 写真を載せた人（Googleマップの表示名）と、そのページ。帰属表示に使う */
  author: string
  authorUri?: string
  /** site.config の photoNotes と並び順・大きさが合ったときの説明 */
  note?: PhotoNote
}

export type GooglePlace = {
  rating: number
  count: number
  reviewsUri: string
  photos: GooglePhoto[]
}

const API = 'https://places.googleapis.com/v1'
const TIMEOUT_MS = 3500
const MAX_PHOTOS = 10

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

async function getJson(url: string, key: string, fieldMask?: string): Promise<unknown> {
  const headers: Record<string, string> = { 'X-Goog-Api-Key': key }
  if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Places API ${res.status} ${url.split('?')[0]}`)
  return res.json()
}

async function toPhoto(raw: unknown, index: number, key: string): Promise<GooglePhoto | null> {
  if (!isRecord(raw)) return null
  const name = text(raw.name)
  const width = count(raw.widthPx)
  const height = count(raw.heightPx)
  if (!name || !width || !height) return null

  // skipHttpRedirect で画像そのものではなく配信 URL（photoUri）を受け取る
  const media = await getJson(`${API}/${name}/media?maxWidthPx=1200&maxHeightPx=1200&skipHttpRedirect=true`, key).catch(() => null)
  const src = isRecord(media) ? text(media.photoUri) : undefined
  if (!src) return null

  const authors = Array.isArray(raw.authorAttributions) ? raw.authorAttributions : []
  const author = isRecord(authors[0]) ? authors[0] : {}
  const note = site.google.photoNotes[index]
  return {
    src,
    width,
    height,
    author: text(author.displayName) ?? '',
    authorUri: text(author.uri),
    note: note && note.width === width && note.height === height ? note : undefined,
  }
}

export const getGooglePlace = createServerFn({ method: 'GET' }).handler(async (): Promise<GooglePlace | null> => {
  // env はリクエストの中でだけ読む（モジュールのトップレベルで読まない）
  const key: unknown = Reflect.get(env, 'GOOGLE_MAPS_API_KEY')
  if (typeof key !== 'string' || !key) return null

  try {
    const place = await getJson(
      `${API}/places/${site.google.placeId}?languageCode=ja`,
      key,
      'rating,userRatingCount,photos,googleMapsLinks',
    )
    if (!isRecord(place)) return null

    const rawPhotos = Array.isArray(place.photos) ? place.photos.slice(0, MAX_PHOTOS) : []
    const photos = await Promise.all(rawPhotos.map((raw, i) => toPhoto(raw, i, key)))
    const links = isRecord(place.googleMapsLinks) ? place.googleMapsLinks : {}

    return {
      rating: count(place.rating) ?? site.google.rating,
      count: count(place.userRatingCount) ?? site.google.count,
      reviewsUri: text(links.reviewsUri) ?? site.google.mapsUrl,
      photos: photos.filter((photo): photo is GooglePhoto => photo !== null),
    }
  } catch (error) {
    console.error('Googleマップの情報を取れませんでした', error)
    return null
  }
})
