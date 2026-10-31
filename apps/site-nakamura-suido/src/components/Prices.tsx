import { Anchor, Box, SimpleGrid, Text } from '@mantine/core'
import { display } from '../theme'
import { site } from '../site.config'
import { Icon } from './Icon'
import { Section } from './Section'

/** 料金の実例。どこに書かれていた金額かを必ず添える */
export function Prices() {
  const { prices } = site
  if (!prices) return null

  return (
    <Section id="price" kicker="料金" lead={prices.lead} title={prices.title}>
      <SimpleGrid cols={{ base: 1, xs: 2, md: prices.items.length }} spacing={{ base: 12, md: 20 }}>
        {prices.items.map((item) => (
          <Box bg="white" key={item.title} p={{ base: 22, sm: 26 }} style={{ border: '1px solid var(--st-line)', borderRadius: 18 }}>
            <Text c="var(--st-sub)" fw={700} fz={12} style={{ letterSpacing: '0.08em' }}>
              {item.note}
            </Text>
            <Text fw={700} fz={{ base: 16, sm: 17 }} lh={1.5} mt={6}>
              {item.title}
            </Text>
            <Text ff={display} fw={700} fz={{ base: 34, sm: 38 }} lh={1.2} mt={14} style={{ letterSpacing: '0.01em' }}>
              {item.price}
              <Box component="span" ff="inherit" fz={15} fw={700} ml={4}>
                円
              </Box>
            </Text>
          </Box>
        ))}
      </SimpleGrid>
      <Text c="dimmed" fz={12} lh={1.8} mt={16}>
        出典：
        <Anchor c="var(--st-accent-deep)" href={prices.href} rel="noopener" style={{ alignItems: 'center', display: 'inline-flex', gap: 4 }} target="_blank">
          {prices.source}
          <Icon name="external" size={11} />
        </Anchor>
        。1回のご依頼の金額で、税の扱いや台数は書かれていません。
      </Text>
    </Section>
  )
}
