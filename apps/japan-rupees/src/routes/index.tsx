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
const ORDER: CityId[] = ['tokyo', 'hakone', 'kyoto', 'nara', 'osaka', 'hiroshima', 'fukuoka']

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

function HomeComponent() {
  const [days, setDays] = useState(7)
  const [style, setStyle] = useState<Style>('mid')
  const [cities, setCities] = useState<CityId[]>(['tokyo', 'kyoto', 'osaka'])
  const [open, setOpen] = useState(false)
  const result = quoteTrip({ days, style, cities, returnToTokyo: false })
  const route = ORDER.filter((id) => cities.includes(id))
  const spare = ORDER.filter((id) => !cities.includes(id))

  return (
    <Box mih="100vh" bg="#10241c" px="md" py="sm" style={{ display: 'flex', flexDirection: 'column' }}>
      <Text size="xs" c="#d6f25a" fw={700} style={{ letterSpacing: '0.18em' }}>
        BOARDING PASS · BENGALURU
      </Text>
      <Box
        mt="xs"
        bg="#f7f1e4"
        c="#1a140c"
        bdrs={18}
        px="md"
        pt="md"
        pb="sm"
        pos="relative"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 16px 36px rgba(0,0,0,.28)' }}
      >
        <Group justify="space-between" align="flex-end">
          <Stack gap={0}>
            <Text size="xs" c="#8a7368" fw={700} style={{ letterSpacing: '0.14em' }}>
              FROM
            </Text>
            <Text fz={28} fw={750} lh={1}>
              BLR
            </Text>
          </Stack>
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 13.2 22 4l-4.2 12.2-5.2-2.1L10 21l-2.1-6.2L2 13.2z" fill="#c4372f" />
          </svg>
          <Stack gap={0} align="flex-end">
            <Text size="xs" c="#8a7368" fw={700} style={{ letterSpacing: '0.14em' }}>
              TO
            </Text>
            <Text fz={28} fw={750} lh={1}>
              JAPAN
            </Text>
          </Stack>
        </Group>
        <Text fz={46} fw={750} lh={1} mt="sm">
          {result.ok ? rupees(result.quote.totalInr) : 'Add a city'}
        </Text>
        <Text size="sm" c="#5c5148">
          {result.ok ? `One adult · ${days} days · ${result.quote.nights} nights · estimate` : 'Pick at least one city.'}
        </Text>
        <Stack gap={0} mt="md" style={{ flex: 1 }}>
          {(result.ok ? result.quote.stays : route.map((id) => ({ id, label: CITY_LABEL[id], nights: 0, dayTrip: false }))).map((stay, index, list) => (
            <UnstyledButton
              key={stay.id}
              onClick={() => setCities((current) => (current.length === 1 ? current : current.filter((city) => city !== stay.id)))}
              style={{ flex: 1, display: 'flex' }}
            >
              <Group gap={12} wrap="nowrap" align="stretch" style={{ flex: 1 }}>
                <Stack gap={0} align="center" w={16}>
                  <Box w={10} h={10} bdrs={99} bg="#c4372f" mt={6} />
                  {index < list.length - 1 && <Box w={2} bg="#e7d7c4" style={{ flex: 1 }} />}
                </Stack>
                <Box>
                  <Text fw={750} fz={20} lh={1.1}>
                    {stay.label}
                  </Text>
                  <Text size="sm" c="#8a7368">
                    {stay.dayTrip ? 'Day trip' : `${stay.nights} ${stay.nights === 1 ? 'night' : 'nights'}`}
                  </Text>
                </Box>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
        <Box my="xs" h={1} style={{ background: 'repeating-linear-gradient(90deg,#1a140c 0 7px,transparent 7px 13px)' }} />
        <Box pos="absolute" left={-11} top="58%" w={22} h={22} bg="#10241c" bdrs={99} />
        <Box pos="absolute" right={-11} top="58%" w={22} h={22} bg="#10241c" bdrs={99} />
        <Group justify="space-between" wrap="nowrap">
          {STYLES.map((item) => (
            <UnstyledButton
              key={item.id}
              onClick={() => setStyle(item.id)}
              px="sm"
              py={6}
              bdrs="xl"
              bg={style === item.id ? '#1a140c' : 'transparent'}
              c={style === item.id ? '#f7f1e4' : '#1a140c'}
              bd="1px solid #1a140c"
              fw={700}
              style={{ flex: 1, textAlign: 'center' }}
            >
              {item.label}
            </UnstyledButton>
          ))}
        </Group>
        <Group justify="space-between" mt={8} wrap="nowrap">
          <UnstyledButton onClick={() => setDays((value) => Math.max(3, value - 1))} aria-label="Fewer days" fw={700} px={8}>
            −
          </UnstyledButton>
          <Text fw={750}>{days} days</Text>
          <UnstyledButton onClick={() => setDays((value) => Math.min(18, value + 1))} aria-label="More days" fw={700} px={8}>
            +
          </UnstyledButton>
        </Group>
        <Text size="xs" c="#8a7368" mt={6}>
          Add a stop
        </Text>
        <Group gap={12} mt={2}>
          {spare.map((id) => (
            <UnstyledButton key={id} onClick={() => setCities((current) => [...current, id])} fw={700} c="#1a140c">
              + {CITY_LABEL[id]}
            </UnstyledButton>
          ))}
        </Group>
        {result.ok && (
          <Text size="sm" mt={6} fw={600}>
            {result.quote.rail.passWins ? 'Rail pass wins on this route.' : 'Point-to-point tickets are cheaper.'}
          </Text>
        )}
        <Group gap={3} mt="sm" justify="center" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <Box key={index} w={index % 4 === 0 ? 3 : 2} h={28} bg="#1a140c" />
          ))}
        </Group>
      </Box>
      <UnstyledButton mt={8} c="#b7cbbf" ta="left" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide the breakdown' : 'The lines, the vegetarian phrase, the rate'}
      </UnstyledButton>
      {open && result.ok && (
        <Stack gap={4} mt={6}>
          {result.quote.lines.map((line) => (
            <Group key={line.id} justify="space-between">
              <Text size="sm" c="#f6f3ea">
                {line.label}
              </Text>
              <Text size="sm" c="#f6f3ea" fw={700}>
                {rupees(line.inr)}
              </Text>
            </Group>
          ))}
          <Text size="sm" c="#f6f3ea">
            {result.quote.veg[0]}
          </Text>
          <Text size="xs" c="#b7cbbf">
            {result.quote.assumptions[1]}
          </Text>
        </Stack>
      )}
      <Footer current="japan-rupees" light />
    </Box>
  )
}
