import '@mantine/core/styles.css'

import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  Link,
} from '@tanstack/react-router'
import { ColorSchemeScript, Container, Divider, Group, MantineProvider, Text, Title, mantineHtmlProps } from '@mantine/core'
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
        title: 'Tokyo Outfit | 東京の気温で服装提案',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <AppHeader />
      <Outlet />
    </RootDocument>
  )
}

function AppHeader() {
  return (
    <>
      <Container size="sm" py="sm">
        <Group justify="space-between">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Title order={3}>👕 Tokyo Outfit</Title>
          </Link>
          <Group gap="lg">
            <Text component={Link} to="/" fw={500}>
              今日の提案
            </Text>
            <Text component={Link} to="/closet" fw={500}>
              クローゼット
            </Text>
          </Group>
        </Group>
      </Container>
      <Divider mb="md" />
    </>
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
