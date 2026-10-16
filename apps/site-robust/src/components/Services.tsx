import { Box, SimpleGrid, Text, Title } from '@mantine/core'
import { site } from '../site.config'
import { Img } from './Img'
import { Section } from './Section'

export function Services() {
  return (
    <Section
      eyebrow="SERVICE"
      id="services"
      lead="一部屋の床の張り替えから、マンション全体のリフォームまでお受けしています。"
      soft
      title="できること"
    >
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 'xl', md: 32 }}>
        {site.services.map((service) => (
          <Box bg="white" key={service.title} style={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(40,30,10,0.06)' }}>
            {service.photo && <Img photo={service.photo} radius={0} ratio="3 / 2" />}
            <Box p={{ base: 'lg', sm: 28 }}>
              <Title fz={{ base: 'lg', sm: 21 }} order={3}>
                {service.title}
              </Title>
              <Text c="gray.7" fz="sm" lh={1.9} mt="sm">
                {service.description}
              </Text>
              {service.price && (
                <Text
                  c="brand.7"
                  fw={700}
                  fz="sm"
                  mt="md"
                  pt="sm"
                  style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}
                >
                  <Text c="gray.6" component="span" fw={500} fz="xs" mr={8}>
                    費用の目安
                  </Text>
                  {service.price}
                </Text>
              )}
            </Box>
          </Box>
        ))}
      </SimpleGrid>
    </Section>
  )
}
