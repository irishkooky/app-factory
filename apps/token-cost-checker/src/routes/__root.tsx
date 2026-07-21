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
  AppShell,
  ColorSchemeScript,
  Group,
  MantineProvider,
  Text,
  UnstyledButton,
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
        title: 'Token Cost Checker | Claudeモデル料金電卓',
      },
    ],
  }),
  component: RootComponent,
})

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <UnstyledButton
      component={Link}
      to={to}
      px="sm"
      py={6}
      style={{ borderRadius: 8 }}
      activeProps={{
        style: {
          borderRadius: 8,
          backgroundColor: 'var(--mantine-color-indigo-0)',
          color: 'var(--mantine-color-indigo-7)',
          fontWeight: 600,
        },
      }}
    >
      {label}
    </UnstyledButton>
  )
}

function RootComponent() {
  return (
    <RootDocument>
      <AppShell header={{ height: 56 }} padding="md">
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Text fw={700} size="lg" c="indigo.7">
              💰 Token Cost Checker
            </Text>
            <Group gap={4} wrap="nowrap">
              <NavLink to="/" label="電卓" />
              <NavLink to="/pricing" label="料金表" />
            </Group>
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
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
