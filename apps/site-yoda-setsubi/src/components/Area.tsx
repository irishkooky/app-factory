import { Box, Group, Text } from '@mantine/core'
import { site } from '../site.config'
import { Icon } from './Icon'
import { Section } from './Section'

export function Area() {
  const { area } = site
  if (!area) return null

  return (
    <Section center eyebrow="AREA" id="area" soft title={area.title}>
      <Group gap={10} justify="center" maw={880} mx="auto">
        {area.places.map((place) => (
          <Group
            bg="white"
            c="brand.8"
            gap={6}
            key={place}
            px={16}
            py={8}
            style={{ borderRadius: 999, border: '1px solid var(--mantine-color-brand-2)' }}
            wrap="nowrap"
          >
            <Icon name="pin" size={14} />
            <Text fw={500} fz={{ base: 'sm', sm: 'md' }}>
              {place}
            </Text>
          </Group>
        ))}
      </Group>
      {area.note && (
        <Box mt="xl" ta="center">
          <Text c="gray.7" fz="sm">
            {area.note}
          </Text>
        </Box>
      )}
    </Section>
  )
}
