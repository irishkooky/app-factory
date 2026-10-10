import { Box, Card, SimpleGrid, Text, Title } from '@mantine/core'
import { site } from '../site.config'
import { Section } from './Section'

export function Services() {
  return (
    <Section eyebrow="SERVICE" id="services" soft title="サービス">
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {site.services.map((service) => (
          <Card key={service.title} padding={0} radius="lg" withBorder>
            {service.photo && (
              <Box
                alt={service.photo.alt}
                component="img"
                loading="lazy"
                src={service.photo.src}
                style={{ aspectRatio: '3 / 2', display: 'block', objectFit: 'cover', width: '100%' }}
              />
            )}
            <Box p="lg">
              <Title fz="lg" order={3}>
                {service.title}
              </Title>
              <Text c="gray.7" fz="sm" lh={1.8} mt="sm">
                {service.description}
              </Text>
            </Box>
          </Card>
        ))}
      </SimpleGrid>
    </Section>
  )
}
