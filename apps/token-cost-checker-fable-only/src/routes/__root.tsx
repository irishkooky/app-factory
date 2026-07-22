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
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
  Container,
  Group,
  Anchor,
  Title,
  Box,
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
        title: 'Token Cost Checker (Fable Only)',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Box component="header" py="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Container size="md">
          <Group justify="space-between" wrap="wrap">
            <Title order={4}>Token Cost Checker (Fable Only)</Title>
            <Group gap="md">
              <Anchor component={Link} to="/" size="sm">
                料金電卓
              </Anchor>
              <Anchor component={Link} to="/pricing" size="sm">
                モデル単価表
              </Anchor>
            </Group>
          </Group>
        </Container>
      </Box>
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
          {children}
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
