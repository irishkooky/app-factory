import { Box, SimpleGrid, Text, Title } from '@mantine/core'
import { site } from '../site.config'
import { Section } from './Section'

export function Strengths() {
  return (
    <Section eyebrow="STRENGTH" id="strengths" title={`${site.company.shortName}が選ばれる理由`}>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {site.strengths.map((item, i) => (
          <Box key={item.title} pt="md" style={{ borderTop: '2px solid var(--mantine-color-brand-6)' }}>
            <Text c="brand" fw={700} fz={30}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Title fz="lg" mt={4} order={3}>
              {item.title}
            </Title>
            <Text c="gray.7" fz="sm" lh={1.8} mt={8}>
              {item.description}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Section>
  )
}
