import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Anchor, Box, Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { Footer } from '../footer'
import { ANIME } from '../domain'
import { PlaceScene } from '../scenes'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const SHORT: Record<string, string> = {
  'your-name': 'Your Name',
  weathering: 'Weathering',
  suzume: 'Suzume',
  'slam-dunk': 'Slam Dunk',
  'demon-slayer': 'Demon Slayer',
}

function mapHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function pinFor(area: string): { x: number; y: number } {
  if (area.includes('Kamakura') || area.includes('Shonan')) return { x: 46, y: 58 }
  if (area.includes('Kobe')) return { x: 34, y: 66 }
  if (area.includes('Hida') || area.includes('Gifu')) return { x: 40, y: 52 }
  return { x: 46, y: 46 }
}

function JapanPin({ area }: { area: string }) {
  const pin = pinFor(area)
  return (
    <svg width="52" height="68" viewBox="0 0 80 104" aria-hidden="true">
      <ellipse cx="58" cy="14" rx="11" ry="8" fill="rgba(255,255,255,.92)" />
      <path d="M54 22c-6 6-14 8-18 16-4 8-10 12-8 22 2 8 10 12 8 20-2 8-8 12-4 18 6 2 14-4 16-12 4-8 2-14 8-20 6-6 12-8 12-16 0-8-6-14-6-22 0-4-4-6-8-6z" fill="rgba(255,255,255,.92)" />
      <ellipse cx="22" cy="86" rx="8" ry="9" fill="rgba(255,255,255,.92)" />
      <circle cx={pin.x} cy={pin.y} r="4.5" fill="#e23b32" />
      <circle cx={pin.x} cy={pin.y} r="8" fill="none" stroke="#e23b32" strokeWidth="1.6" />
    </svg>
  )
}

function HomeComponent() {
  const [filmId, setFilmId] = useState(ANIME[0]?.id ?? 'your-name')
  const [spotIndex, setSpotIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const anime = ANIME.find((item) => item.id === filmId) ?? ANIME[0]
  if (!anime) return null
  const spot = anime.spots[Math.min(spotIndex, anime.spots.length - 1)] ?? anime.spots[0]
  if (!spot) return null

  return (
    <Box h="100vh" pos="relative" style={{ overflow: 'hidden' }} bg="#101820">
      <Box pos="absolute" inset={0}>
        <PlaceScene name={spot.name} />
      </Box>
      <Stack gap={0} pos="absolute" top={12} left={12}>
        <JapanPin area={spot.area} />
        <Box bg="rgba(255,255,255,.88)" px={6} py={2} bdrs="sm" mt={2}>
          <Text size="xs" fw={700} c="#142033" style={{ letterSpacing: '0.08em' }}>
            {spot.area.split(',')[0]?.toUpperCase()}
          </Text>
        </Box>
      </Stack>
      <Group gap={6} pos="absolute" top={16} right={14}>
        {anime.spots.map((item, index) => (
          <UnstyledButton
            key={item.name}
            aria-label={`Stop ${index + 1}, ${item.name}`}
            onClick={() => setSpotIndex(index)}
            w={10}
            h={10}
            bdrs={99}
            bg={index === spotIndex ? '#f2c14e' : 'rgba(255,255,255,.75)'}
          />
        ))}
      </Group>
      <Box
        pos="absolute"
        left={0}
        right={0}
        bottom={0}
        px="md"
        pt={72}
        pb="sm"
        style={{ background: 'linear-gradient(transparent, rgba(8,12,18,.55) 18%, rgba(8,12,18,.92))' }}
      >
        <Text size="xs" c="#f2c14e" fw={700} style={{ letterSpacing: '0.16em' }}>
          {anime.title.toUpperCase()}
        </Text>
        <Text fz={30} fw={750} lh={1.05} c="#fff">
          {spot.name}
        </Text>
        <Text c="rgba(255,255,255,.82)" mb="xs">
          {spot.area}
        </Text>
        <Anchor href={mapHref(spot.mapsQuery)} target="_blank" rel="noreferrer" fw={700} c="#f2c14e" underline="never">
          Open this place in Maps
        </Anchor>
        <Group gap={10} mt="sm">
          {ANIME.map((item) => {
            const on = item.id === anime.id
            return (
              <UnstyledButton
                key={item.id}
                onClick={() => {
                  setFilmId(item.id)
                  setSpotIndex(0)
                  setOpen(false)
                }}
                aria-pressed={on}
                c={on ? '#f2c14e' : 'rgba(255,255,255,.78)'}
                fw={700}
                style={{ flex: '0 0 auto', borderBottom: on ? '2px solid #f2c14e' : '2px solid transparent', paddingBottom: 4 }}
              >
                {SHORT[item.id] ?? item.title}
              </UnstyledButton>
            )
          })}
        </Group>
        <UnstyledButton mt={8} c="rgba(255,255,255,.72)" onClick={() => setOpen((value) => !value)}>
          {open ? 'Hide the walk' : 'Train, manners, and the rest of the walk'}
        </UnstyledButton>
        {open && (
          <Stack gap={4} mt={6}>
            <Text size="sm" c="#fff">
              {spot.why}
            </Text>
            <Text size="sm" c="rgba(255,255,255,.86)">
              {spot.access}
            </Text>
            <Text size="sm" c="rgba(255,255,255,.86)">
              {spot.manners}
            </Text>
          </Stack>
        )}
        <Footer current="anime-pilgrimage" light />
      </Box>
    </Box>
  )
}
