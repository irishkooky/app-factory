import { Box, Button, Group, SimpleGrid, Text } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Icon } from './Icon'
import { IconBadge } from './IconBadge'
import { Section } from './Section'

export function Symptoms() {
  if (!site.symptoms?.length) return null

  return (
    <Section
      center
      eyebrow="TROUBLE"
      id="trouble"
      lead="ひとつでも当てはまったら、まずはお電話ください。状態をお聞きして、すぐに伺えるかをお伝えします。"
      title="こんなお困りごと、ありませんか？"
    >
      <SimpleGrid cols={{ base: 2, md: 3 }} spacing={{ base: 'sm', sm: 'lg' }}>
        {site.symptoms.map((item) => (
          <Box
            key={item.title}
            p={{ base: 'md', sm: 'xl' }}
            style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}
          >
            <Group align="flex-start" gap="md" wrap="nowrap">
              <Box visibleFrom="sm">
                <IconBadge name={item.icon} />
              </Box>
              <Box>
                <Box hiddenFrom="sm" mb={8}>
                  <IconBadge name={item.icon} size={40} />
                </Box>
                <Text fw={700} fz={{ base: 'sm', sm: 'lg' }} lh={1.5}>
                  {item.title}
                </Text>
                <Text c="gray.7" fz={{ base: 'xs', sm: 'sm' }} lh={1.8} mt={6}>
                  {item.description}
                </Text>
              </Box>
            </Group>
          </Box>
        ))}
      </SimpleGrid>
      <Group justify="center" mt={{ base: 40, sm: 56 }}>
        <Button component="a" href={tel} leftSection={<Icon name="phone" size={22} />} radius="xl" size="xl" styles={{ label: { fontSize: 20 } }}>
          {site.contact.phone} に電話する
        </Button>
      </Group>
    </Section>
  )
}
