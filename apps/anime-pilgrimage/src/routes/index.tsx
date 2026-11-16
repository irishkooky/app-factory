import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Anchor, Box, Button, Card, Container, Stack, Text, Title } from '@mantine/core'
import { Footer } from '../footer'
import { ANIME } from '../domain'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function mapHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function HomeComponent() {
  const [id, setId] = useState(ANIME[0]?.id ?? 'your-name')
  const anime = ANIME.find((item) => item.id === id) ?? ANIME[0]

  return (
    <Box mih="100vh" bg="#f6f3ee">
      <Container size="sm" px="md" py="lg">
        <Stack gap="lg">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Real places only
            </Text>
            <Title order={1}>Anime pilgrimage</Title>
            <Text>
              Pick a film. The stops are places you can actually stand, with the train that gets you there. If a famous shot was a drawing, it is not on the list.
            </Text>
          </Stack>

          <Stack gap="xs">
            {ANIME.map((item) => (
              <Button
                key={item.id}
                size="lg"
                variant={item.id === anime?.id ? 'filled' : 'default'}
                onClick={() => setId(item.id)}
                justify="space-between"
                fullWidth
              >
                {item.title}
              </Button>
            ))}
          </Stack>

          {anime ? (
            <Stack gap="md">
              <Text>
                {anime.title}, {anime.year}. {anime.blurb}
              </Text>
              <Text fw={600}>{anime.route}</Text>
              {anime.spots.map((spot, index) => (
                <Card key={spot.name} withBorder padding="md" radius="md">
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      Stop {index + 1}, {spot.area}
                    </Text>
                    <Title order={3}>{spot.name}</Title>
                    <Text>{spot.why}</Text>
                    <Text size="sm">{spot.access}</Text>
                    <Text size="sm" c="dimmed">
                      {spot.manners}
                    </Text>
                    <Anchor href={mapHref(spot.mapsQuery)} target="_blank" rel="noreferrer">
                      Open in Maps
                    </Anchor>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : null}

          <Footer current="anime-pilgrimage" />
        </Stack>
      </Container>
    </Box>
  )
}
