import { Anchor, Group, Text } from '@mantine/core'

const HOOKS = [
  { id: 'kanji-name', href: 'https://kanji-name.ichigoooo.workers.dev', label: 'Seal' },
  { id: 'anime-pilgrimage', href: 'https://anime-pilgrimage.ichigoooo.workers.dev', label: 'Films' },
  { id: 'japan-rupees', href: 'https://japan-rupees.ichigoooo.workers.dev', label: 'Rupees' },
  { id: 'ask-japanese', href: 'https://ask-japanese.ichigoooo.workers.dev', label: 'Ask' },
] as const

export type HookId = (typeof HOOKS)[number]['id']

export function Footer({ current, light = false }: { current: HookId; light?: boolean }) {
  const color = light ? 'rgba(255,248,242,.72)' : '#8a7368'
  return (
    <Group justify="space-between" mt="md" wrap="nowrap" gap="xs">
      <Anchor href="https://www.linkedin.com/in/yoshihirokurosaki" target="_blank" rel="noreferrer" size="xs" style={{ color }} underline="never">
        Yoshihiro Kurosaki, Tokyo
      </Anchor>
      <Group gap={10} wrap="nowrap">
        {HOOKS.filter((hook) => hook.id !== current).map((hook) => (
          <Anchor key={hook.id} href={hook.href} size="xs" c={light ? 'yellow.3' : 'red.7'} underline="never">
            {hook.label}
          </Anchor>
        ))}
      </Group>
    </Group>
  )
}
