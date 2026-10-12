import '@mantine/core/styles.css'

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

const title = `${site.company.name}｜${site.company.industry}`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title },
      { name: 'description', content: site.site.description },
      // 提案用サンプルは検索結果に出さない
      ...(site.site.isProposal ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'ja_JP' },
      { property: 'og:site_name', content: site.company.name },
      { property: 'og:title', content: title },
      { property: 'og:description', content: site.site.description },
      { property: 'og:url', content: site.site.url },
      { property: 'og:image', content: new URL(site.hero.photo.src, site.site.url).href },
    ],
    links: [
      { rel: 'canonical', href: site.site.url },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@500;600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
})

const globalCss = `
html { scroll-behavior: smooth; scroll-padding-top: 72px; }
body { color: var(--mantine-color-black); -webkit-font-smoothing: antialiased; }
h1, h2, h3 { font-feature-settings: 'palt'; letter-spacing: 0.04em; }
img { display: block; }
.flow-step + .flow-step { border-top: 1px dashed var(--mantine-color-gray-4); }
@media (min-width: 62em) { .flow-step + .flow-step { border-top: 0; } .strength-reverse > :first-child { order: 2; } }
@media (max-width: 47.99em) { body { padding-bottom: 64px; } }
`

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
        <style>{globalCss}</style>
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
