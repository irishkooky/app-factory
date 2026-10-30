import { useState } from 'react'
import { ActionIcon, Anchor, Box, Burger, Button, Container, Drawer, Group, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { site } from '../site.config'
import { useGooglePlace } from './GooglePlace'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { OpenNow } from './OpenNow'

export const tel = `tel:${site.contact.phone.replaceAll('-', '')}`

/** ナビの項目。施工写真は Googleマップから取れたときだけ出す */
export function useNavItems() {
  const { photos } = useGooglePlace()
  return [
    { id: 'trouble', title: 'お困りごと' },
    ...(photos.length ? [{ id: 'works', title: '施工写真' }] : []),
    { id: 'price', title: '料金' },
    { id: 'reasons', title: '選ばれる理由' },
    { id: 'leak', title: '漏水・減額' },
    { id: 'company', title: '会社案内' },
  ]
}

export function Header() {
  const [opened, { toggle, close }] = useDisclosure(false)
  // メニューを開いている間はスクロールが止まるので、閉じ終わってから移動する
  const [target, setTarget] = useState<string | null>(null)
  const navItems = useNavItems()

  return (
    <Box
      component="header"
      pos="sticky"
      style={{
        backdropFilter: 'saturate(1.4) blur(10px)',
        background: 'rgba(247,244,238,0.9)',
        borderBottom: '1px solid rgba(19,32,43,0.08)',
        top: 0,
        zIndex: 100,
      }}
    >
      <Container h={{ base: 64, sm: 76 }} size="lg">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Anchor aria-label={`${site.company.name} トップへ`} href="#top" underline="never">
            <Logo />
          </Anchor>

          <Group component="nav" gap={26} visibleFrom="lg" wrap="nowrap">
            {navItems.map((item) => (
              <Anchor c="black" fw={500} fz={14} href={`#${item.id}`} key={item.id} underline="never">
                {item.title}
              </Anchor>
            ))}
          </Group>

          <Group gap="md" visibleFrom="sm" wrap="nowrap">
            <Box ta="right">
              <Button
                className="yd-cta-ink"
                component="a"
                href={tel}
                leftSection={<Icon name="phone" size={18} />}
                radius="xl"
                size="md"
                styles={{ label: { fontSize: 18, letterSpacing: '0.04em' } }}
              >
                {site.contact.phone}
              </Button>
              <Box mt={4} pr={4}>
                <OpenNow compact />
              </Box>
            </Box>
            <Burger aria-label="メニュー" hiddenFrom="lg" onClick={toggle} opened={opened} size="sm" />
          </Group>

          <Group gap={6} hiddenFrom="sm" wrap="nowrap">
            <ActionIcon aria-label="電話する" className="yd-cta" component="a" href={tel} radius="xl" size={44}>
              <Icon name="phone" size={20} />
            </ActionIcon>
            <Burger aria-label="メニュー" onClick={toggle} opened={opened} size="sm" />
          </Group>
        </Group>
      </Container>

      <Drawer
        hiddenFrom="lg"
        onClose={close}
        onExitTransitionEnd={() => {
          if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
          setTarget(null)
        }}
        opened={opened}
        position="right"
        size="82%"
        title={<Logo />}
        styles={{ content: { background: 'var(--yd-paper)' }, header: { background: 'var(--yd-paper)' } }}
      >
        <Stack component="nav" gap={0} mt="sm">
          {[...navItems, { id: 'area', title: '対応エリア' }, { id: 'faq', title: 'よくあるご質問' }].map((item) => (
            <Anchor
              c="black"
              fw={700}
              fz="md"
              href={`#${item.id}`}
              key={item.id}
              onClick={(event) => {
                event.preventDefault()
                setTarget(item.id)
                close()
              }}
              py={14}
              style={{ borderBottom: '1px solid var(--yd-line)', display: 'flex', justifyContent: 'space-between' }}
              underline="never"
            >
              {item.title}
              <Box c="var(--yd-brass-deep)" component="span">
                <Icon name="arrow" size={16} />
              </Box>
            </Anchor>
          ))}
          <Button
            className="yd-cta-ink"
            component="a"
            h={58}
            href={tel}
            leftSection={<Icon name="phone" size={20} />}
            mt="xl"
            radius="xl"
            styles={{ label: { fontSize: 20, letterSpacing: '0.04em' } }}
          >
            {site.contact.phone}
          </Button>
          <Text c="dimmed" fz="xs" lh={1.8} mt={10} ta="center">
            受付 {site.contact.hours}
          </Text>
        </Stack>
      </Drawer>
    </Box>
  )
}
