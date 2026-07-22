import '@mantine/core/styles.css'

import type { ReactNode } from 'react'
import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { Anchor, ColorSchemeScript, Container, Group, MantineProvider, Text, mantineHtmlProps } from '@mantine/core'
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
        title: 'Token Cost Checker B',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Container size="md" py="md">
        <Group justify="space-between">
          <Text fw={700}>Token Cost Checker B</Text>
          <Group gap="md">
            <Anchor component={Link} to="/">
              電卓
            </Anchor>
            <Anchor component={Link} to="/pricing">
              単価表
            </Anchor>
          </Group>
        </Group>
      </Container>
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
