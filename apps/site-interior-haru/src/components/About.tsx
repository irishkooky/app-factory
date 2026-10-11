import { Box, SimpleGrid, Text } from '@mantine/core'
import { site } from '../site.config'
import { Section } from './Section'

export function About() {
  const { about } = site

  return (
    <Section eyebrow="ABOUT" id="about" title={about.title}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40} style={{ alignItems: 'center' }}>
        <Text c="gray.8" fz={{ base: 'md', sm: 'lg' }} lh={2}>
          {about.body}
        </Text>
        {about.photo && (
          <Box
            alt={about.photo.alt}
            component="img"
            loading="lazy"
            src={about.photo.src}
            style={{ aspectRatio: '4 / 3', borderRadius: 16, objectFit: 'cover', width: '100%' }}
          />
        )}
      </SimpleGrid>
    </Section>
  )
}
