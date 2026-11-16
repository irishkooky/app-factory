import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Anchor, Box, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { Footer } from '../footer'
import { ANIME, type Anime } from '../domain'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const TONES: Record<string, string> = {
  'your-name': '#12315c',
  weathering: '#0e3b4c',
  suzume: '#7d1d22',
  'slam-dunk': '#14324a',
  'demon-slayer': '#3d1a16',
}

function mapHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function Torii() {
  return (
    <svg width="120" height="78" viewBox="0 0 120 78" aria-hidden="true">
      <path d="M8 22h104M22 22v40M86 22v40" stroke="#e23b34" strokeWidth="8" fill="none" />
      <path d="M14 10h92" stroke="#e23b34" strokeWidth="6" />
    </svg>
  )
}

function FilmCard({ anime, active, onPick }: { anime: Anime; active: boolean; onPick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onPick}
      aria-pressed={active}
      w="100%"
      ta="left"
      p="sm"
      bdrs="lg"
      bd={active ? '2px solid #f2c14e' : '0'}
      bg={TONES[anime.id] ?? '#12315c'}
      c="#f7f3ea"
      style={{ cursor: 'pointer' }}
    >
      <Text size="xs" c="#f2c14e" fw={700} style={{ letterSpacing: '0.12em' }}>
        {anime.year}
      </Text>
      <Text fz={18} fw={750} lh={1.1}>
        {anime.title}
      </Text>
      <Text size="sm" c="rgba(247,243,234,.8)">
        {anime.spots[0]?.name}
      </Text>
    </Box>
  )
}

function HomeComponent() {
  const [id, setId] = useState(ANIME[0]?.id ?? 'your-name')
  const [open, setOpen] = useState(false)
  const anime = ANIME.find((item) => item.id === id) ?? ANIME[0]
  if (!anime) return null

  return (
    <Box mih="100vh" bg="#f6f1e8" c="#14120f" px="md" py="lg">
      <Stack gap="sm" maw={420} mx="auto">
        <Text size="xs" tt="uppercase" fw={700} c="#b42318" style={{ letterSpacing: '0.16em' }}>
          Real places only
        </Text>
        <Text fz={34} fw={750} lh={0.95}>
          Where was it filmed?
        </Text>

        <Box bg={TONES[anime.id] ?? '#12315c'} c="#f7f3ea" bdrs={24} p="lg" pos="relative" style={{ overflow: 'hidden', minHeight: 210 }}>
          <Box pos="absolute" right={12} bottom={8} style={{ opacity: 0.95 }}>
            <Torii />
          </Box>
          <Text size="xs" c="#f2c14e" fw={700} style={{ letterSpacing: '0.14em' }}>
            {anime.title.toUpperCase()}
          </Text>
          <Text fz={28} fw={750} lh={1.05} maw={230} mt={6}>
            {anime.spots[0]?.name}
          </Text>
          <Text size="sm" mt={6} c="rgba(247,243,234,.82)">
            {anime.spots[0]?.area}
          </Text>
        </Box>

        <SimpleGrid cols={2} spacing={8}>
          {ANIME.filter((item) => item.id !== anime.id).map((item) => (
            <FilmCard key={item.id} anime={item} active={false} onPick={() => { setId(item.id); setOpen(false) }} />
          ))}
        </SimpleGrid>

        <Group gap={8}>
          {anime.spots.map((spot, index) => (
            <Anchor key={spot.name} href={mapHref(spot.mapsQuery)} target="_blank" rel="noreferrer" underline="never">
              <Box bg="#fff" bdrs="xl" px="sm" py={8} bd="1.5px solid #1a120f">
                <Text size="xs" c="#b42318" fw={700}>
                  {index + 1}
                </Text>
                <Text size="sm" fw={700} c="#1a120f">
                  {spot.name}
                </Text>
              </Box>
            </Anchor>
          ))}
        </Group>
        <details open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}>
          <summary style={{ cursor: 'pointer', color: '#8a7368' }}>Trains, manners, and why each stop counts</summary>
          <Stack gap={6} mt={8}>
            <Text size="sm">{anime.route}</Text>
            {anime.spots.map((spot) => (
              <Text key={spot.name} size="sm">
                <b>{spot.name}.</b> {spot.why} {spot.access} {spot.manners}
              </Text>
            ))}
            <Text size="sm">{anime.blurb}</Text>
          </Stack>
        </details>
        <Footer current="anime-pilgrimage" />
      </Stack>
    </Box>
  )
}
