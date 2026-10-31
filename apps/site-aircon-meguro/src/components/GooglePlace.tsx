import { createContext, useContext, type ReactNode } from 'react'
import { Anchor, Box, Text } from '@mantine/core'
import type { GooglePhoto, GooglePlace } from '../server/place'
import { site, type MenuKey } from '../site.config'
import { Icon } from './Icon'

const PlaceContext = createContext<GooglePlace | null>(null)

export function GooglePlaceProvider({ value, children }: { value: GooglePlace | null; children: ReactNode }) {
  return <PlaceContext.Provider value={value}>{children}</PlaceContext.Provider>
}

/** Googleマップの評価と写真。API が使えないときは site.config の値と写真なしになる */
export function useGooglePlace() {
  const place = useContext(PlaceContext)
  const photos = place?.photos ?? []
  return {
    rating: place?.rating ?? site.google.rating,
    count: place?.count ?? site.google.count,
    reviewsUri: place?.reviewsUri ?? site.google.mapsUrl,
    photos,
    /** ヒーローに重ねる写真（hero の順。足りなければ hide でない写真で埋める） */
    heroPhotos: [
      ...photos.filter((p) => p.note?.hero).sort((a, b) => (a.note?.hero ?? 0) - (b.note?.hero ?? 0)),
      ...photos.filter((p) => !p.note?.hero && !p.note?.hide),
    ].slice(0, 3),
    /** メニューごとの写真。施工前の写真は除き、同じ題の写真は1枚にする */
    photosFor: (key: MenuKey) => {
      const list = photos.filter((p) => p.note?.menu === key && p.note.pair?.role !== 'before' && !p.note.hide)
      return list.filter((p, i) => list.findIndex((q) => q.note?.title === p.note?.title) === i)
    },
    /** 施工前後の組。両方そろったものだけ */
    pairs: Object.values(
      photos.reduce<Record<string, { before?: GooglePhoto; after?: GooglePhoto }>>((acc, photo) => {
        const pair = photo.note?.pair
        if (pair) acc[pair.id] = { ...acc[pair.id], [pair.role]: photo }
        return acc
      }, {}),
    ).flatMap((pair) => (pair.before && pair.after ? [{ before: pair.before, after: pair.after }] : [])),
  }
}

/** 星5つ。文章の中にも置けるように span で組む */
export function Stars({ size = 16, color = '#f5b301' }: { size?: number; color?: string }) {
  return (
    <Box aria-hidden c={color} component="span" style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={size} />
      ))}
    </Box>
  )
}

/**
 * Googleマップの写真を出す。並べ方は呼ぶ側の箱が決め、ここは枠いっぱいに敷くだけ。
 * Google の配信 URL はリファラなしで読む
 */
export function GoogleImg({ photo, alt, fit = 'cover', eager }: { photo: GooglePhoto; alt?: string; fit?: 'cover' | 'contain'; eager?: boolean }) {
  return (
    <Box
      alt={alt ?? photo.note?.title ?? `${site.company.name}の施工写真`}
      component="img"
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      src={photo.src}
      style={{ display: 'block', height: '100%', objectFit: fit, width: '100%' }}
    />
  )
}

/** 写真の出どころ（Google Maps Platform の帰属表示）。載せた人をすべて並べる */
export function PhotoCredit({ photos, dark }: { photos: GooglePhoto[]; dark?: boolean }) {
  const authors = photos
    .filter((p) => p.author)
    .filter((p, i, list) => list.findIndex((q) => q.author === p.author) === i)
  if (!authors.length) return null
  return (
    <Text c={dark ? 'rgba(255,255,255,0.6)' : 'dimmed'} fz={11} lh={1.6}>
      写真：
      {authors.map((p, i) => (
        <span key={p.author}>
          {i > 0 && '、'}
          {p.authorUri ? (
            <Anchor c="inherit" href={p.authorUri} rel="noopener" target="_blank" underline="always">
              {p.author}
            </Anchor>
          ) : (
            p.author
          )}
        </span>
      ))}
      （Google マップに掲載）
      <Box component="span" ff="Roboto, Arial, sans-serif" ml={6} style={{ letterSpacing: 0 }}>
        Google Maps
      </Box>
    </Text>
  )
}
