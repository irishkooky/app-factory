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

const TITLE = 'app-factory LAB — つくったWebアプリ置き場'
const DESCRIPTION = 'AIと一緒に作ったWebツール・ゲーム・デモを全部ここに並べています。'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: TITLE,
      },
      {
        name: 'description',
        content: DESCRIPTION,
      },
      {
        property: 'og:title',
        content: TITLE,
      },
      {
        property: 'og:description',
        content: DESCRIPTION,
      },
      {
        property: 'og:type',
        content: 'website',
      },
    ],
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
        <ColorSchemeScript />
        <HeadContent />
      </head>
      <body style={{ background: '#f7f6f2' }}>
        <MantineProvider theme={theme}>
          {children}
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
