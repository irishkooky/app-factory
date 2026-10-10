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
    links: [{ rel: 'canonical', href: site.site.url }],
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
        <style>{'html { scroll-behavior: smooth; scroll-padding-top: 64px; }'}</style>
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
