import type { ReactNode } from 'react'
import { AppShell, Group, Title, Anchor } from '@mantine/core'
import { Link, useRouterState } from '@tanstack/react-router'

export function PageLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap" gap="xs">
          <Title order={4} truncate style={{ minWidth: 0 }}>
            Token Cost Checker (sonnet Only)
          </Title>
          <Group gap="md" wrap="nowrap" style={{ flexShrink: 0 }}>
            <Anchor component={Link} to="/" fw={pathname === '/' ? 700 : 400} underline="hover">
              計算
            </Anchor>
            <Anchor component={Link} to="/pricing" fw={pathname === '/pricing' ? 700 : 400} underline="hover">
              料金表
            </Anchor>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
