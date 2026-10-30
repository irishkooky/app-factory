import { Anchor, Box, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Icon } from './Icon'
import { IconBadge } from './IconBadge'
import { Section } from './Section'

export function Stars({ size = 20 }: { size?: number }) {
  return (
    <Group c="#f5b301" gap={2} wrap="nowrap">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={size} />
      ))}
    </Group>
  )
}

/** Google マップの評価と、クチコミに多く書かれていることの要約 */
export function Reviews() {
  const { reviews } = site
  if (!reviews) return null

  return (
    <Section eyebrow="REVIEW" id="reviews" soft title="クチコミで多く書かれていること">
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing={{ base: 'xl', md: 48 }}>
        <Box bg="white" p={{ base: 'xl', sm: 36 }} style={{ borderRadius: 8, alignSelf: 'start' }} ta="center">
          <Text c="gray.7" fw={500} fz="sm">
            Googleマップの評価
          </Text>
          <Text c="brand.8" ff={serif} fw={600} fz={64} lh={1.1} mt="xs">
            {reviews.rating}
          </Text>
          <Group justify="center" mt={8}>
            <Stars size={24} />
          </Group>
          <Text c="gray.7" fz="sm" mt="md">
            クチコミ {reviews.count}件
          </Text>
          <Anchor fw={700} fz="sm" href={reviews.mapsUrl} mt="lg" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} target="_blank">
            Googleマップでクチコミを読む
            <Icon name="arrow" size={16} />
          </Anchor>
        </Box>
        <Stack gap="lg" style={{ gridColumn: 'span 2' }}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {reviews.points.map((point) => (
              <Box bg="white" key={point.title} p={{ base: 'lg', sm: 'xl' }} style={{ borderRadius: 8 }}>
                <Group gap="sm" wrap="nowrap">
                  <IconBadge name={point.icon} size={40} />
                  <Title fz={{ base: 'md', sm: 18 }} lh={1.5} order={3}>
                    {point.title}
                  </Title>
                </Group>
                <Text c="gray.7" fz="sm" lh={1.9} mt="md">
                  {point.description}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
          <Text c="gray.6" fz="xs">
            ※ Googleマップに寄せられたクチコミの内容を、当方で要約したものです（原文ではありません）。
          </Text>
        </Stack>
      </SimpleGrid>
    </Section>
  )
}
