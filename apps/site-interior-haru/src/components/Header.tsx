import { Anchor, Box, Burger, Button, Container, Drawer, Group, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { site } from '../site.config'
import { Icon } from './Icon'

export const tel = `tel:${site.contact.phone.replaceAll('-', '')}`

const items = [
  { id: 'about', title: '私たちについて' },
  { id: 'services', title: 'サービス' },
  ...(site.gallery?.photos.length ? [{ id: 'works', title: site.gallery.title }] : []),
  { id: 'company', title: '会社概要・アクセス' },
  { id: 'contact', title: 'お問い合わせ' },
]

export function Header() {
  const [opened, { toggle, close }] = useDisclosure(false)

  return (
    <Box
      bg="white"
      component="header"
      pos="sticky"
      style={{ top: 0, zIndex: 100, borderBottom: '1px solid var(--mantine-color-gray-3)' }}
    >
      <Container h={64} size="lg">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Anchor c="dark.9" fw={700} fz={{ base: 'lg', sm: 'xl' }} href="#top" underline="never">
            {site.company.shortName}
          </Anchor>

          <Group component="nav" gap="lg" visibleFrom="lg">
            {items.map((item) => (
              <Anchor c="gray.7" fw={500} fz="sm" href={`#${item.id}`} key={item.id} underline="never">
                {item.title}
              </Anchor>
            ))}
            <Button component="a" href={tel} leftSection={<Icon name="phone" size={16} />} radius="xl">
              {site.contact.phone}
            </Button>
          </Group>

          <Burger aria-label="メニュー" hiddenFrom="lg" onClick={toggle} opened={opened} />
        </Group>
      </Container>

      <Drawer
        hiddenFrom="lg"
        onClose={close}
        opened={opened}
        position="right"
        size="80%"
        title={<Text fw={700}>{site.company.shortName}</Text>}
      >
        <Stack component="nav" gap={0}>
          {items.map((item) => (
            <Anchor
              c="gray.8"
              fw={500}
              href={`#${item.id}`}
              key={item.id}
              onClick={close}
              py="sm"
              style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
              underline="never"
            >
              {item.title}
            </Anchor>
          ))}
          <Button component="a" href={tel} leftSection={<Icon name="phone" />} mt="lg" radius="xl" size="md">
            {site.contact.phone}
          </Button>
        </Stack>
      </Drawer>
    </Box>
  )
}
