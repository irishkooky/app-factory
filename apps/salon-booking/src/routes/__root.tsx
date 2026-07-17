import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'

import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
  AppShell,
  Group,
  Stack,
  Title,
  Text,
  Container,
} from '@mantine/core'
import { theme } from '../theme'
import { AnchorLink, ButtonLink } from '../components/app-link'

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
        title: 'SALON LUMIÈRE｜表参道の美容室 予約サイト',
      },
      {
        name: 'description',
        content:
          '表参道のプライベートサロン SALON LUMIÈRE（サロン ルミエール）の公式予約サイト。カット・カラー・パーマ・トリートメントなどのご予約はこちらから。',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <AppShell header={{ height: 72 }} padding={0}>
        <AppShell.Header>
          <Container size="lg" h="100%">
            <Group h="100%" justify="space-between">
              <AnchorLink to="/" underline="never" c="inherit">
                <Stack gap={0}>
                  <Title order={2} c="orange.7">
                    SALON LUMIÈRE
                  </Title>
                  <Text size="xs" c="dimmed" fw={600} lts={2}>
                    OMOTESANDO
                  </Text>
                </Stack>
              </AnchorLink>
              <ButtonLink to="/reserve" size="md">
                予約する
              </ButtonLink>
            </Group>
          </Container>
        </AppShell.Header>
        <AppShell.Main>
          <Outlet />
          <Container size="lg" py="xl">
            <Stack gap={4} align="center">
              <AnchorLink to="/admin" size="xs" c="dimmed">
                管理画面（デモ）
              </AnchorLink>
              <Text size="xs" c="dimmed">
                &copy; {new Date().getFullYear()} SALON LUMIÈRE
              </Text>
            </Stack>
          </Container>
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
