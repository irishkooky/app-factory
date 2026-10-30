import { Anchor, Box, Burger, Button, Container, Drawer, Group, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { serif } from '../theme'
import { site } from '../site.config'
import { Icon } from './Icon'

export const tel = `tel:${site.contact.phone.replaceAll('-', '')}`

export const navItems = [
  { id: 'services', title: 'できること' },
  ...(site.reviews ? [{ id: 'reviews', title: 'クチコミ' }] : []),
  ...(site.selfCheck ? [{ id: 'check', title: '漏水チェック' }] : []),
  { id: 'about', title: '私たちについて' },
  ...(site.gallery?.items.length ? [{ id: 'works', title: site.gallery.title }] : []),
  ...(site.flow?.length ? [{ id: 'flow', title: 'ご依頼の流れ' }] : []),
  ...(site.area ? [{ id: 'area', title: '対応エリア' }] : []),
  { id: 'company', title: '会社概要' },
]

export function Header() {
  const [opened, { toggle, close }] = useDisclosure(false)

  return (
    <Box
      bg="rgba(255,255,255,0.96)"
      component="header"
      pos="sticky"
      style={{ top: 0, zIndex: 100, borderBottom: '1px solid var(--mantine-color-gray-2)', backdropFilter: 'blur(8px)' }}
    >
      <Container h={72} size="lg">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Anchor c="black" href="#top" underline="never">
            <Text c="gray.6" fz={10} lh={1} style={{ letterSpacing: '0.12em' }}>
              {site.company.industry}
            </Text>
            <Text ff={serif} fw={700} fz={{ base: 20, sm: 24 }} lh={1.3} mt={4}>
              {site.company.shortName}
            </Text>
          </Anchor>

          <Group component="nav" gap={28} visibleFrom="lg" wrap="nowrap">
            {navItems.map((item) => (
              <Anchor c="gray.8" fw={500} fz="sm" href={`#${item.id}`} key={item.id} underline="never">
                {item.title}
              </Anchor>
            ))}
            <Box>
              <Button component="a" href={tel} leftSection={<Icon name="phone" size={18} />} radius="xl" size="md">
                {site.contact.phone}
              </Button>
              <Text c="gray.6" fz={10} mt={2} ta="center">
                受付 {site.contact.hours}
              </Text>
            </Box>
          </Group>

          <Burger aria-label="メニュー" hiddenFrom="lg" onClick={toggle} opened={opened} size="sm" />
        </Group>
      </Container>

      <Drawer
        hiddenFrom="lg"
        onClose={close}
        opened={opened}
        position="right"
        size="80%"
        title={
          <Text ff={serif} fw={700} fz="lg">
            {site.company.shortName}
          </Text>
        }
      >
        <Stack component="nav" gap={0}>
          {[...navItems, { id: 'contact', title: 'お問い合わせ' }].map((item) => (
            <Anchor
              c="gray.8"
              fw={500}
              href={`#${item.id}`}
              key={item.id}
              onClick={close}
              py="md"
              style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
              underline="never"
            >
              {item.title}
            </Anchor>
          ))}
          <Button component="a" href={tel} leftSection={<Icon name="phone" />} mt="xl" radius="xl" size="lg">
            {site.contact.phone}
          </Button>
          <Text c="gray.6" fz="xs" mt={6} ta="center">
            受付 {site.contact.hours}
            {site.contact.holidays && `（${site.contact.holidays}休み）`}
          </Text>
        </Stack>
      </Drawer>
    </Box>
  )
}
