import { Box, SimpleGrid } from '@mantine/core'
import { site } from '../site.config'
import { Section } from './Section'

export function Gallery() {
  const gallery = site.gallery
  if (!gallery?.photos.length) return null

  return (
    <Section eyebrow="WORKS" id="works" soft title={gallery.title}>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing={{ base: 'xs', sm: 'md' }}>
        {gallery.photos.map((photo) => (
          <Box
            alt={photo.alt}
            component="img"
            key={photo.src}
            loading="lazy"
            src={photo.src}
            style={{ aspectRatio: '1 / 1', borderRadius: 12, objectFit: 'cover', width: '100%' }}
          />
        ))}
      </SimpleGrid>
    </Section>
  )
}
