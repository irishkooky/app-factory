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
import { theme } from '../theme'
import { site } from '../site.config'

const { company, contact, google } = site
const { title, description, url } = site.site

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const hh = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** 検索エンジン向けの店舗情報。評価はGoogleのものなので入れない（自分で載せる評価は対象外） */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Plumber',
  name: company.name,
  url,
  telephone: `+81-${contact.phone.slice(1)}`,
  image: `${url}/og.png`,
  address: {
    '@type': 'PostalAddress',
    postalCode: contact.postalCode,
    addressRegion: '神奈川県',
    addressLocality: '横浜市金沢区',
    streetAddress: contact.address.replace(/^神奈川県横浜市金沢区/, ''),
    addressCountry: 'JP',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 35.3432354, longitude: 139.603433 },
  hasMap: google.mapsUrl,
  areaServed: { '@type': 'City', name: '横浜市金沢区' },
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
      { name: 'theme-color', content: '#0f2638' },
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
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
      },
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
