import { Box, SimpleGrid, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { IconBadge } from './IconBadge'
import { Section } from './Section'

export function Strengths() {
  return (
    <Section eyebrow="STRENGTH" id="strengths" title={`${site.company.shortName}が選ばれる理由`}>
      <SimpleGrid cols={{ base: 1, md: site.strengths.length }} spacing={{ base: 'lg', md: 'xl' }}>
        {site.strengths.map((item, i) => (
          <Box
            key={item.title}
            p={{ base: 'xl', sm: 32 }}
            pos="relative"
            style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(20,40,60,0.08)' }}
          >
            <Text
              aria-hidden
              c="brand.1"
              ff={serif}
              fw={600}
              fz={64}
              lh={1}
              pos="absolute"
              right={24}
              top={20}
            >
              {String(i + 1).padStart(2, '0')}
            </Text>
            {item.icon && <IconBadge name={item.icon} size={56} />}
            <Title fz={{ base: 20, sm: 22 }} lh={1.6} mt="lg" order={3} pos="relative">
              {item.title}
            </Title>
            <Text c="gray.7" fz={{ base: 'sm', sm: 'md' }} lh={2} mt="md">
              {item.description}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Section>
  )
}
