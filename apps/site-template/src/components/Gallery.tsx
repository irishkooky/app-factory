import { Box, SimpleGrid, Text } from '@mantine/core'
import { site } from '../site.config'
import { Img } from './Img'
import { Section } from './Section'

export function Gallery() {
  const gallery = site.gallery
  if (!gallery?.items.length) return null

  return (
    <Section eyebrow="WORKS" id="works" soft title={gallery.title}>
      <SimpleGrid cols={{ base: 2, md: 3 }} spacing={{ base: 'md', sm: 'xl' }} verticalSpacing={{ base: 'xl', sm: 40 }}>
        {gallery.items.map((item) => (
          <Box component="figure" key={item.src} m={0}>
            <Img photo={item} ratio="4 / 3" />
            <Box component="figcaption" mt={12}>
              <Text fw={700} fz={{ base: 'sm', sm: 'md' }} lh={1.6}>
                {item.title}
              </Text>
              {item.meta && (
                <Text c="gray.6" fz={{ base: 11, sm: 'xs' }} mt={2}>
                  {item.meta}
                </Text>
              )}
            </Box>
          </Box>
        ))}
      </SimpleGrid>
    </Section>
  )
}
