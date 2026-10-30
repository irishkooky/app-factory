import { Box, SimpleGrid, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Section } from './Section'

export function SelfCheck() {
  const { selfCheck } = site
  if (!selfCheck) return null

  return (
    <Section eyebrow="CHECK" id="check" lead={selfCheck.lead} title={selfCheck.title}>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing={{ base: 'md', md: 'xl' }}>
        {selfCheck.steps.map((step, i) => (
          <Box
            key={step.title}
            p={{ base: 'lg', sm: 'xl' }}
            style={{ borderRadius: 8, borderTop: '4px solid var(--mantine-color-brand-6)', background: 'var(--mantine-color-brand-0)' }}
          >
            <Text c="accent" ff={serif} fw={600} fz={14} style={{ letterSpacing: '0.2em' }}>
              STEP {i + 1}
            </Text>
            <Title fz={{ base: 'lg', sm: 20 }} lh={1.5} mt={8} order={3}>
              {step.title}
            </Title>
            <Text c="gray.7" fz="sm" lh={1.9} mt="sm">
              {step.description}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
      {selfCheck.note && (
        <Text c="brand.8" fw={500} fz={{ base: 'sm', sm: 'md' }} lh={1.9} mt="xl">
          {selfCheck.note}
        </Text>
      )}
    </Section>
  )
}
