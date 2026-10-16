import { Box, SimpleGrid, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Section } from './Section'

export function Voices() {
  if (!site.voices?.length) return null

  return (
    <Section eyebrow="VOICE" id="voices" soft title="お客様の声">
      <SimpleGrid cols={{ base: 1, md: site.voices.length }} spacing={{ base: 'lg', md: 'xl' }}>
        {site.voices.map((voice) => (
          <Box bg="white" key={voice.name + voice.meta} p={{ base: 'xl', sm: 32 }} pos="relative" style={{ borderRadius: 4 }}>
            <Text aria-hidden c="accent" ff={serif} fz={64} lh={0.6} style={{ opacity: 0.35 }}>
              “
            </Text>
            <Text fz={{ base: 'sm', sm: 'md' }} lh={2} mt="md">
              {voice.body}
            </Text>
            <Text c="gray.6" fz="xs" mt="lg">
              {voice.meta && `${voice.meta}　`}
              {voice.name}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Section>
  )
}
