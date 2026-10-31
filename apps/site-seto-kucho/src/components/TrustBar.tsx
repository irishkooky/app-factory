import type { ReactNode } from 'react'
import { Anchor, Box, Container, SimpleGrid, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Stars, useGooglePlace } from './GooglePlace'
import { Icon, type IconName } from './Icon'

/** ヒーロー直下の「確かめられる事実」。先頭は Googleマップの★、残りは site.config の trust */
export function TrustBar() {
  const { rating, count, reviewsUri } = useGooglePlace()

  const items: { icon: IconName; label: string; value: ReactNode; href?: string; source?: string }[] = [
    {
      icon: 'star',
      label: 'Googleマップの評価',
      value: (
        <Box component="span" style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
          {rating.toFixed(1)}
          <Stars size={14} />
          <Box c="dimmed" component="span" ff="inherit" fw={500} fz={13}>
            {count}件
          </Box>
        </Box>
      ),
      href: reviewsUri,
      source: 'クチコミを読む',
    },
    ...site.trust,
  ]

  return (
    <Box bg="white" id="credentials" style={{ borderBottom: '1px solid var(--st-line)' }}>
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing={0}>
          {items.map((item) => (
            <Box
              className="st-trust-item"
              key={item.label}
              px={{ base: 0, md: 24 }}
              py={{ base: 18, md: 30 }}
              style={{ alignItems: 'flex-start', display: 'flex', gap: 14 }}
            >
              <Box c="var(--st-accent-deep)" mt={2}>
                <Icon name={item.icon} size={24} stroke={1.6} />
              </Box>
              <Box>
                <Text c="var(--st-sub)" fw={700} fz={12} lh={1.5}>
                  {item.label}
                </Text>
                <Text className="st-phrase" ff={serif} fw={700} fz={item.value === undefined || typeof item.value !== 'string' || item.value.length < 12 ? 20 : 16} lh={1.5} mt={2}>
                  {item.value}
                </Text>
                {item.href && (
                  <Anchor
                    c="var(--st-accent-deep)"
                    fw={700}
                    fz={11}
                    href={item.href}
                    rel="noopener"
                    style={{ alignItems: 'center', display: 'inline-flex', gap: 4 }}
                    target="_blank"
                  >
                    {item.source}
                    <Icon name="external" size={11} />
                  </Anchor>
                )}
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}
