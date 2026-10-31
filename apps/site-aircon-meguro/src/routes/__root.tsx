import '@mantine/core/styles.css'
import '../styles.css'

import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { color, fontsHref, theme } from '../theme'
import { site } from '../site.config'
import { MAP_CENTER } from '../data/area-map'

const { company, contact, google, area } = site
const { title, description, url } = site.site

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const hh = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** '#rrggbb' を 'r, g, b' にする（rgba() の中で使う） */
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')

/** 色は theme.ts の color だけを正にして、CSS 変数として配る */
const cssVars = `:root{--st-ink:${color.ink};--st-sub:${color.sub};--st-muted:${color.muted};--st-line:${color.line};--st-paper:${color.paper};--st-paper-deep:${color.paperDeep};--st-deep:${color.deep};--st-deep-soft:${color.deepSoft};--st-deepest:color-mix(in srgb, ${color.deep} 80%, #000);--st-accent:${color.accent};--st-accent-deep:${color.accentDeep};--st-accent-ink:${color.accentInk};--st-accent-rgb:${rgb(color.accent)};--st-glow:${color.glow};--st-open:${color.open}}`

const prefecture = contact.address.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/)?.[0] ?? ''

/** 検索エンジン向けの店舗情報。評価はGoogleのものなので入れない（自分で載せる評価は対象外） */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': site.site.schemaType,
  name: company.name,
  url,
  telephone: `+81-${contact.phone.slice(1)}`,
  image: `${url}/og.png`,
  address: {
    '@type': 'PostalAddress',
    postalCode: contact.postalCode,
    addressRegion: prefecture,
    addressLocality: area.city,
    streetAddress: contact.address.replace(prefecture, '').replace(area.city, ''),
    addressCountry: 'JP',
  },
  geo: { '@type': 'GeoCoordinates', latitude: MAP_CENTER[0], longitude: MAP_CENTER[1] },
  hasMap: google.mapsUrl,
  areaServed: { '@type': 'City', name: area.city },
  openingHoursSpecification: contact.schedule.flatMap((hours, day) =>
    hours ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DAYS[day], opens: hh(hours[0]), closes: hh(hours[1]) }] : [],
  ),
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title },
      { name: 'description', content: description },
      { name: 'theme-color', content: color.deep },
      { name: 'format-detection', content: 'telephone=no' },
      // 提案用サンプルは検索結果に出さない
      ...(site.site.isProposal ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'ja_JP' },
      { property: 'og:site_name', content: company.name },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: `${url}/og.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: fontsHref },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        <HeadContent />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme.ts の色から作った固定の CSS */}
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      </head>
      <body>
        <MantineProvider theme={theme} forceColorScheme="light">
          {children}
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
