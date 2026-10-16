import { Box, SimpleGrid, Stack, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Img } from './Img'
import { Section } from './Section'

export function About() {
  const { about } = site

  return (
    <Section eyebrow="ABOUT" id="about" title={about.title}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 40, md: 72 }} style={{ alignItems: 'center' }}>
        {about.photo && (
          <Box pos="relative" pb={{ base: 16, sm: 24 }} pr={{ base: 16, sm: 24 }}>
            <Box
              bg="brand.0"
              pos="absolute"
              style={{ bottom: 0, left: 32, right: 0, top: 32, borderRadius: 4 }}
            />
            <Img photo={about.photo} pos="relative" ratio="4 / 5" />
          </Box>
        )}
        <Stack gap="lg">
          {about.body.map((paragraph) => (
            <Text c="gray.8" fz={{ base: 'md', sm: 17 }} key={paragraph} lh={2.1}>
              {paragraph}
            </Text>
          ))}
          {about.signature && (
            <Text c="brand.8" ff={serif} fw={600} fz="lg" mt="sm" ta="right">
              {about.signature}
            </Text>
          )}
        </Stack>
      </SimpleGrid>
    </Section>
  )
}
