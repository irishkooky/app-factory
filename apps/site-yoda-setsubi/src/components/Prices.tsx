import { Box, SimpleGrid, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Icon } from './Icon'
import { Section } from './Section'

/** 料金の実例。先方が Googleマップの写真に書き込んでいる金額だけを使う */
export function Prices() {
  return (
    <Section
      id="price"
      kicker="料金の例"
      lead={`${site.company.name}がGoogleマップに載せている施工例の金額です。部品や状態で変わるので、伺って確かめてから、作業の前に金額をお伝えします。`}
      no="03"
      title="金額は、作業の前にお伝えします。"
    >
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={{ base: 14, sm: 24 }}>
        {site.prices.map((price, i) => (
          <Box
            bg="white"
            key={price.title}
            p={{ base: 24, sm: 32 }}
            pos="relative"
            style={{ border: '1px solid var(--yd-line)', borderRadius: 18, overflow: 'hidden' }}
          >
            <Text aria-hidden c="var(--yd-paper-deep)" ff={serif} fw={800} fz={92} lh={1} pos="absolute" right={14} top={8}>
              {i + 1}
            </Text>
            <Box pos="relative">
              <Text c="var(--yd-brass-deep)" fw={700} fz={12} style={{ letterSpacing: '0.12em' }}>
                {price.where}
                {price.count && `・${price.count}`}
              </Text>
              <Text fw={700} fz={{ base: 17, sm: 18 }} mt={6}>
                {price.title}
              </Text>
              <Text ff={serif} fw={800} fz={{ base: 42, sm: 46 }} lh={1.1} mt={18} style={{ letterSpacing: '0.02em' }}>
                {price.price}
                <Box component="span" fz={18} fw={700} ml={4}>
                  円
                </Box>
              </Text>
            </Box>
          </Box>
        ))}
      </SimpleGrid>

      <Box
        mt={{ base: 20, sm: 28 }}
        p={{ base: 20, sm: 28 }}
        style={{ alignItems: 'flex-start', background: 'var(--yd-paper-deep)', borderRadius: 16, display: 'flex', gap: 14 }}
      >
        <Box c="var(--yd-brass-deep)" mt={2}>
          <Icon name="yen" size={22} stroke={1.8} />
        </Box>
        <Box>
          <Text fw={700} fz={{ base: 15, sm: 16 }} lh={1.8}>
            「部品代と修理代を合わせても、ホームセンターに頼むのと変わらなかった」という声もあります。
          </Text>
          <Text c="var(--yd-sub)" fz={12} lh={1.8} mt={6}>
            Googleマップのクチコミを当方で要約したものです（原文ではありません）。見積もりや出張の費用などは、お電話でお気軽にお尋ねください。
          </Text>
        </Box>
      </Box>
    </Section>
  )
}
