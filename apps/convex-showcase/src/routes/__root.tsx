import '@mantine/core/styles.css'

import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  Link,
} from '@tanstack/react-router'
import {
  Anchor,
  Box,
  ColorSchemeScript,
  Group,
  MantineProvider,
  Text,
  mantineHtmlProps,
} from '@mantine/core'
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
        title: 'Convex Showcase — リアルタイム＆リレーショナル体感デモ',
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
      <body>
        <MantineProvider theme={theme}>
          <Box
            style={(t) => ({
              borderBottom: `1px solid ${t.colors.gray[3]}`,
            })}
          >
            <Group justify="space-between" px="lg" py="sm" wrap="nowrap">
              <Anchor component={Link} to="/" underline="never">
                <Text fw={700} size="lg" c="dark">
                  Convex Showcase ⚡
                </Text>
              </Anchor>
              <Group gap="lg">
                <Anchor component={Link} to="/">
                  デモ
                </Anchor>
                <Anchor component={Link} to="/why">
                  なぜConvexか
                </Anchor>
              </Group>
            </Group>
          </Box>
          {children}
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
