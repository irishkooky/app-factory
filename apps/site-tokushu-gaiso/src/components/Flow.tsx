import { Box, SimpleGrid, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Section } from './Section'

export function Flow() {
  if (!site.flow?.length) return null

  return (
    <Section center eyebrow="FLOW" id="flow" lead="はじめての方にも、流れがわかるようにご説明します。" title="ご依頼の流れ">
      <SimpleGrid cols={{ base: 1, md: site.flow.length }} spacing={{ base: 0, md: 'md' }}>
        {site.flow.map((step, i) => (
          <Box
            className="flow-step"
            key={step.title}
            pos="relative"
            px={{ base: 0, md: 'xs' }}
            py={{ base: 'lg', md: 0 }}
          >
            <Box display="flex" style={{ alignItems: 'center', gap: 16 }}>
              <Box
                bg="brand.7"
                c="white"
                display="flex"
                ff={serif}
                fw={600}
                fz="lg"
                h={52}
                miw={52}
                style={{ alignItems: 'center', borderRadius: '50%', justifyContent: 'center' }}
                w={52}
              >
                {i + 1}
              </Box>
              <Title fz={{ base: 'lg', md: 17 }} order={3}>
                {step.title}
              </Title>
            </Box>
            <Text c="gray.7" fz="sm" lh={1.9} mt="sm" pl={{ base: 68, md: 0 }}>
              {step.description}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Section>
  )
}
