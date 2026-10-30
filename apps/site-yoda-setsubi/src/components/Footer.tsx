import { Anchor, Box, Container, Group, Stack, Text } from '@mantine/core'
import { site } from '../site.config'
import { tel, useNavItems } from './Header'
import { Logo } from './Logo'

export function Footer() {
  const { company, contact, credentials } = site
  const navItems = useNavItems()

  return (
    <Box bg="#0a1b2b" c="rgba(255,255,255,0.7)" className="yd-footer" component="footer">
      <Container py={{ base: 56, sm: 72 }} size="lg">
        <Group align="flex-start" gap={48} justify="space-between">
          <Box maw={460}>
            <Logo dark size="lg" />
            <Text fz={14} lh={2} mt={24}>
              〒{contact.postalCode} {contact.address}
              <br />
              TEL{' '}
              <Anchor c="white" fw={700} href={tel} underline="never">
                {contact.phone}
              </Anchor>
              <br />
              受付 {contact.hours}
            </Text>
            <Text fz={12} lh={1.9} mt={14}>
              {credentials.map((c) => `${c.title}（${c.value}）`).join('／')}
            </Text>
          </Box>
          <Stack component="nav" gap={12}>
            {[...navItems, { id: 'area', title: '対応エリア' }, { id: 'faq', title: 'よくあるご質問' }].map((item) => (
              <Anchor c="rgba(255,255,255,0.75)" fz={14} href={`#${item.id}`} key={item.id} underline="never">
                {item.title}
              </Anchor>
            ))}
          </Stack>
        </Group>
        <Box mt={48} pt={24} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Text c="rgba(255,255,255,0.45)" fz={11} lh={1.9}>
            施工写真・評価：Google マップ（{company.name}が掲載したもの）／地図：国土数値情報（行政区域データ）・国土地理院をもとに作成
          </Text>
          <Text c="rgba(255,255,255,0.45)" fz={11} mt={6}>
            © {new Date().getFullYear()} {company.name}
          </Text>
        </Box>
      </Container>
    </Box>
  )
}
