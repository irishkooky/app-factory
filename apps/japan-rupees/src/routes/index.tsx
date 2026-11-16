import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core'
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
const BAR: Record<string, string> = {
  flights: '#ff5a4e',
  stay: '#d6f25a',
  food: '#f2c14e',
  local: '#7dcea0',
  rail: '#8eb6ff',
}

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

function Pill({ on, children, onClick }: { on: boolean; children: string; onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={on}
      px="sm"
      py={8}
      bdrs="xl"
      bg={on ? '#d6f25a' : 'transparent'}
      c={on ? '#10241c' : '#f6f3ea'}
      bd={on ? '0' : '1.5px solid rgba(246,243,234,.45)'}
      fw={700}
    >
      {children}
    </UnstyledButton>
  )
}

function HomeComponent() {
  const [days, setDays] = useState(7)
  const [style, setStyle] = useState<Style>('mid')
  const [cities, setCities] = useState<CityId[]>(['tokyo', 'kyoto', 'osaka'])
  const [returnToTokyo, setReturnToTokyo] = useState(false)
  const result = quoteTrip({ days, style, cities, returnToTokyo })
  const max = result.ok ? Math.max(...result.quote.lines.map((line) => line.inr)) : 1

  return (
    <Box mih="100vh" bg="#10241c" c="#f6f3ea" px="md" py="lg">
      <Stack gap="sm" maw={420} mx="auto">
        <Text size="xs" fw={700} c="#d6f25a" style={{ letterSpacing: '0.16em' }}>
          FROM BENGALURU
        </Text>
        <Group justify="space-between" align="flex-end">
          <Text fz={56} fw={750} lh={0.9}>
            {result.ok ? rupees(result.quote.totalInr) : 'Pick a city'}
          </Text>
          <Stack gap={4}>
            <UnstyledButton aria-label="More days" onClick={() => setDays((value) => Math.min(18, value + 1))} c="#d6f25a" fz={28} fw={700}>
              +
            </UnstyledButton>
            <Text ta="center" fw={700}>{days}d</Text>
            <UnstyledButton aria-label="Fewer days" onClick={() => setDays((value) => Math.max(3, value - 1))} c="#d6f25a" fz={28} fw={700}>
              −
            </UnstyledButton>
          </Stack>
        </Group>
        <Text size="lg">{result.ok ? `${result.quote.nights} nights. One adult.` : 'Choose at least one city.'}</Text>

        <Group gap={8}>
          {STYLES.map((item) => (
            <Pill key={item.id} on={style === item.id} onClick={() => setStyle(item.id)}>
              {item.label}
            </Pill>
          ))}
        </Group>
        <Group gap={8}>
          {CITIES.map((id) => (
            <Pill
              key={id}
              on={cities.includes(id)}
              onClick={() => setCities((current) => (current.includes(id) ? current.filter((city) => city !== id) : [...current, id]))}
            >
              {CITY_LABEL[id]}
            </Pill>
          ))}
          <Pill on={returnToTokyo} onClick={() => setReturnToTokyo((value) => !value)}>
            Train back
          </Pill>
        </Group>

        {result.ok && (
          <Stack gap={8} mt={4}>
            {result.quote.lines.map((line) => (
              <Box key={line.id}>
                <Group justify="space-between">
                  <Text size="sm">{line.label}</Text>
                  <Text size="sm" fw={700}>{rupees(line.inr)}</Text>
                </Group>
                <Box h={8} bg="#1e4634" bdrs={99} style={{ overflow: 'hidden' }}>
                  <Box h="100%" w={`${Math.max(8, (line.inr / max) * 100)}%`} bg={BAR[line.id] ?? '#d6f25a'} />
                </Box>
              </Box>
            ))}
            <Text size="sm" c="#d6f25a" fw={700}>
              {result.quote.rail.passWins ? 'The rail pass is cheaper here.' : 'Buy the tickets, not the pass.'}
            </Text>
            <Text size="sm">
              {result.quote.stays.map((stay) => (stay.dayTrip ? `${stay.label} by day` : `${stay.nights}n ${stay.label}`)).join(' → ')}
            </Text>
          </Stack>
        )}

        <details>
          <summary style={{ cursor: 'pointer', color: '#b7cbbf' }}>Estimate, vegetarian line, and the rate</summary>
          {result.ok && (
            <Stack gap={6} mt={8}>
              <Text size="sm">{result.quote.veg[0]}</Text>
              {result.quote.assumptions.map((line) => (
                <Text key={line} size="xs" c="#b7cbbf">
                  {line}
                </Text>
              ))}
            </Stack>
          )}
        </details>
        <Footer current="japan-rupees" light />
      </Stack>
    </Box>
  )
}
