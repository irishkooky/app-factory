import { Box, Container, SimpleGrid, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'

export function Stats() {
  if (!site.stats?.length) return null

  return (
    <Box bg="white" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
      <Container size="lg" py={{ base: 32, sm: 48 }}>
        <SimpleGrid cols={site.stats.length} spacing={0}>
          {site.stats.map((stat, i) => (
            <Box
              key={stat.label}
              px="xs"
              ta="center"
              style={i > 0 ? { borderLeft: '1px solid var(--mantine-color-gray-3)' } : undefined}
            >
              <Text c="gray.7" fw={500} fz={{ base: 11, sm: 'sm' }} style={{ letterSpacing: '0.1em' }}>
                {stat.label}
              </Text>
              <Text c="brand.7" component="p" ff={serif} fw={600} lh={1.2} mt={6}>
                <Box component="span" fz={{ base: 30, sm: 48 }}>
                  {stat.value}
                </Box>
                {stat.unit && (
                  <Box component="span" fz={{ base: 12, sm: 'md' }} ml={4}>
                    {stat.unit}
                  </Box>
                )}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}
