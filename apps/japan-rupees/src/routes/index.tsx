import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Container, Group, Stack, Text, Title, Box } from '@mantine/core'
import { Footer } from '../footer'
import { CITY_LABEL, quoteTrip, type CityId, type Style } from '../domain'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const STYLES: { id: Style; label: string }[] = [
  { id: 'budget', label: 'Budget' },
  { id: 'mid', label: 'Mid' },
  { id: 'comfort', label: 'Comfort' },
]

const CITIES: CityId[] = ['tokyo', 'hakone', 'kyoto', 'nara', 'osaka', 'hiroshima', 'fukuoka']

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

function yen(value: number): string {
  return `¥${value.toLocaleString('en-US')}`
}

function HomeComponent() {
  const [days, setDays] = useState(7)
  const [style, setStyle] = useState<Style>('mid')
  const [cities, setCities] = useState<CityId[]>(['tokyo', 'kyoto', 'osaka'])
  const [returnToTokyo, setReturnToTokyo] = useState(false)
  const result = quoteTrip({ days, style, cities, returnToTokyo })

  function toggleCity(id: CityId) {
    setCities((current) => (current.includes(id) ? current.filter((city) => city !== id) : [...current, id]))
  }

  return (
    <Box mih="100vh" bg="#f6f3ee">
      <Container size="sm" px="md" py="lg">
        <Stack gap="lg">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              One adult, from Bengaluru, in rupees
            </Text>
            <Title order={1}>Japan trip in rupees</Title>
            <Text>
              Pick the days, the style, and the cities. The total is an estimate with the exchange rate and the date written underneath.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text fw={600}>Days</Text>
            <Group>
              <Button variant="default" size="lg" onClick={() => setDays((value) => Math.max(3, value - 1))} aria-label="Fewer days">
                −
              </Button>
              <Title order={2}>{days}</Title>
              <Button variant="default" size="lg" onClick={() => setDays((value) => Math.min(18, value + 1))} aria-label="More days">
                +
              </Button>
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text fw={600}>Style</Text>
            <Group grow>
              {STYLES.map((item) => (
                <Button key={item.id} size="md" variant={style === item.id ? 'filled' : 'default'} onClick={() => setStyle(item.id)}>
                  {item.label}
                </Button>
              ))}
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text fw={600}>Cities</Text>
            <Group gap="xs">
              {CITIES.map((id) => (
                <Button key={id} variant={cities.includes(id) ? 'filled' : 'default'} onClick={() => toggleCity(id)} aria-pressed={cities.includes(id)}>
                  {CITY_LABEL[id]}
                </Button>
              ))}
            </Group>
          </Stack>

          <Button variant={returnToTokyo ? 'filled' : 'default'} onClick={() => setReturnToTokyo((value) => !value)} aria-pressed={returnToTokyo}>
            {returnToTokyo ? 'Train back to Tokyo is included' : 'Add the train back to Tokyo'}
          </Button>

          {result.ok ? (
            <Stack gap="md">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Estimated total
                </Text>
                <Title order={2}>{rupees(result.quote.totalInr)}</Title>
                <Text size="sm">Estimate, not a quote. {result.quote.nights} nights.</Text>
              </Stack>

              <Text>
                {result.quote.stays
                  .map((stay) => (stay.dayTrip ? `${stay.label} as a day trip` : `${stay.nights} nights in ${stay.label}`))
                  .join(', then ')}
                .
              </Text>

              {result.quote.lines.map((line) => (
                <Stack key={line.id} gap={2}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={600}>{line.label}</Text>
                    <Text fw={600}>{rupees(line.inr)}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {line.jpy === null ? line.note : `${yen(line.jpy)}. ${line.note}`}
                  </Text>
                </Stack>
              ))}

              <Text size="sm">
                Tickets on this route are {yen(result.quote.rail.ticketsJpy)}. {result.quote.rail.passLabel} is {yen(result.quote.rail.passJpy)}.
                {result.quote.rail.passWins ? ' The pass is the cheaper one here.' : ' Buy the tickets, not the pass.'}
              </Text>

              <Stack gap={4}>
                <Text fw={600}>Eating vegetarian</Text>
                {result.quote.veg.map((tip) => (
                  <Text key={tip} size="sm">
                    {tip}
                  </Text>
                ))}
              </Stack>

              <Stack gap={4}>
                <Text fw={600}>Assumptions</Text>
                {result.quote.assumptions.map((line) => (
                  <Text key={line} size="sm" c="dimmed">
                    {line}
                  </Text>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Text>{result.reason}</Text>
          )}

          <Footer current="japan-rupees" />
        </Stack>
      </Container>
    </Box>
  )
}
