import { Anchor, Group, Stack, Text } from '@mantine/core'

const HOOKS = [
  { id: 'kanji-name', href: 'https://kanji-name.ichigoooo.workers.dev', label: 'Kanji name' },
  { id: 'anime-pilgrimage', href: 'https://anime-pilgrimage.ichigoooo.workers.dev', label: 'Anime map' },
  { id: 'japan-rupees', href: 'https://japan-rupees.ichigoooo.workers.dev', label: 'Trip in rupees' },
  { id: 'ask-japanese', href: 'https://ask-japanese.ichigoooo.workers.dev', label: 'Ask a Japanese' },
] as const

export type HookId = (typeof HOOKS)[number]['id']

export function Footer({ current }: { current: HookId }) {
  return (
    <Stack gap={6} mt="xl" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <Text size="sm">Made by Yoshihiro Kurosaki, a developer in Tokyo</Text>
      <Anchor href="https://www.linkedin.com/in/yoshihirokurosaki" target="_blank" rel="noreferrer">
        LinkedIn
      </Anchor>
      <Text size="xs" c="dimmed">
        More from the same phone
      </Text>
      <Group gap="md">
        {HOOKS.filter((hook) => hook.id !== current).map((hook) => (
          <Anchor key={hook.id} href={hook.href} size="sm">
            {hook.label}
          </Anchor>
        ))}
      </Group>
    </Stack>
  )
}
