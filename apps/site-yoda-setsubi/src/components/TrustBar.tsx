import type { ReactNode } from 'react'
import { Anchor, Box, Container, SimpleGrid, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Stars, useGooglePlace } from './GooglePlace'
import { Icon, type IconName } from './Icon'

/** ヒーロー直下の「確かめられる事実」。指定番号と掲載は横浜市水道局のページに出典を付ける */
export function TrustBar() {
  const { rating, count, reviewsUri } = useGooglePlace()
  const [designation, listing] = site.credentials
  const sunday = site.contact.schedule[0]

  const items: { icon: IconName; label: string; value: ReactNode; href?: string; source?: string }[] = [
    { icon: 'shield', label: designation.title, value: designation.value, href: designation.href, source: '横浜市水道局で確認' },
    { icon: 'list', label: '水道局の漏水修繕事業者リスト', value: listing.value, href: listing.href, source: '横浜市水道局で確認' },
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
    { icon: 'clock', label: '日曜も受付', value: sunday ? `${sunday[0]}:00〜${sunday[1]}:00` : '要相談' },
  ]

  return (
    <Box bg="white" id="credentials" style={{ borderBottom: '1px solid var(--yd-line)' }}>
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing={0}>
          {items.map((item) => (
            <Box
              key={item.label}
              px={{ base: 0, md: 24 }}
              py={{ base: 18, md: 30 }}
              className="yd-trust-item"
              style={{ alignItems: 'flex-start', display: 'flex', gap: 14 }}
            >
              <Box c="var(--yd-brass-deep)" mt={2}>
                <Icon name={item.icon} size={24} stroke={1.6} />
              </Box>
              <Box>
                <Text c="var(--yd-sub)" fw={700} fz={12} lh={1.5}>
                  {item.label}
                </Text>
                <Text ff={serif} fw={700} fz={20} lh={1.5} mt={2}>
                  {item.value}
                </Text>
                {item.href && (
                  <Anchor
                    c="var(--yd-brass-deep)"
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
