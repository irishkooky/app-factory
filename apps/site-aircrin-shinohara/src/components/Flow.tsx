import { Anchor, Box, SimpleGrid, Text, Title } from '@mantine/core'
import { display, serif } from '../theme'
import { site } from '../site.config'
import { tel } from './Header'
import { Section } from './Section'

export function Flow() {
  return (
    <Section id="flow" kicker="ご依頼の流れ" title="ご予約から、作業まで。">
      <SimpleGrid cols={{ base: 1, sm: 2, md: site.flow.length }} spacing={{ base: 12, md: 20 }}>
        {site.flow.map((step, i) => (
          <Box
            bg="white"
            key={step.title}
            p={{ base: 22, sm: 28 }}
            pos="relative"
            style={{ border: '1px solid var(--st-line)', borderRadius: 18 }}
          >
            <Text c="var(--st-accent-deep)" ff={display} fw={700} fz={13} style={{ letterSpacing: '0.16em' }}>
              STEP {i + 1}
            </Text>
            <Title fz={{ base: 20, sm: 22 }} lh={1.5} mt={8} order={3}>
              {step.title}
            </Title>
            <Text c="var(--st-sub)" className="st-phrase" fz={15} lh={1.9} mt={8}>
              {step.description}
            </Text>
            {i === 0 && (
              <Anchor c="black" ff={serif} fw={800} fz={20} href={tel} mt={12} style={{ display: 'inline-block', letterSpacing: '0.04em' }} underline="never">
                {site.contact.phone}
              </Anchor>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </Section>
  )
}
