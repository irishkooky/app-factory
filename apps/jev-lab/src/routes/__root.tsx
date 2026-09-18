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
        title: 'Jev 日常あるある劇場 — 判断は爆速。空気は読める？',
      },
      {
        name: 'description',
        content: 'お先にどうぞ地獄と帰れない飲み会。日常の小さな気まずさをJevに任せる、コミカルなAI実験劇場。',
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
        <ColorSchemeScript defaultColorScheme="light" />
        <HeadContent />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="light">
          {children}
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
