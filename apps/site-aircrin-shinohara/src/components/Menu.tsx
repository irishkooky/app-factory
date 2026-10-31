import { useState } from 'react'
import { Box, Button, Group, Stack, Text, Title } from '@mantine/core'
import { site, type MenuKey } from '../site.config'
import { GoogleImg, useGooglePlace } from './GooglePlace'
import { tel } from './Header'
import { Icon } from './Icon'
import { Section } from './Section'

/** 機種や症状を選ぶと、よくあるお悩み・できること・作業写真が出る */
export function Menu() {
  const { menu } = site
  const [active, setActive] = useState<MenuKey>(menu.items[0].key)
  const { photosFor } = useGooglePlace()
  const trouble = menu.items.find((t) => t.key === active) ?? menu.items[0]
  const photos = photosFor(trouble.key).slice(0, 2)

  return (
    <Section id="menu" kicker={menu.kicker} lead={menu.lead} title={menu.title}>
      <Box className="st-trouble">
        <div aria-label="機種と症状" className="st-tabs" role="tablist">
          {menu.items.map((t) => (
            <button
              aria-controls="trouble-panel"
              aria-selected={t.key === active}
              className="st-tab"
              id={`trouble-tab-${t.key}`}
              key={t.key}
              onClick={() => setActive(t.key)}
              role="tab"
              type="button"
            >
              <Icon name={t.icon} size={20} stroke={1.8} />
              {t.label}
            </button>
          ))}
        </div>

        <Box
          aria-labelledby={`trouble-tab-${trouble.key}`}
          bg="white"
          className="st-panel"
          id="trouble-panel"
          key={trouble.key}
          p={{ base: 22, sm: 40 }}
          role="tabpanel"
          style={{ border: '1px solid var(--st-line)', borderRadius: 18 }}
        >
          <Box className="st-panel-grid" data-photos={photos.length > 0 || undefined}>
            <Box>
              <Group gap={12} wrap="nowrap">
                <Box
                  c="white"
                  h={48}
                  style={{ alignItems: 'center', background: 'var(--st-deep-soft)', borderRadius: 14, display: 'flex', flex: 'none', justifyContent: 'center' }}
                  w={48}
                >
                  <Icon name={trouble.icon} size={24} stroke={1.8} />
                </Box>
                <Title fz={{ base: 22, sm: 26 }} order={3}>
                  {trouble.label}
                </Title>
              </Group>

              <Stack component="ul" gap={10} mt={24} p={0} style={{ listStyle: 'none' }}>
                {trouble.symptoms.map((symptom) => (
                  <Box component="li" key={symptom} style={{ alignItems: 'flex-start', display: 'flex', gap: 10 }}>
                    <Box
                      c="var(--st-accent-deep)"
                      h={22}
                      mt={2}
                      style={{ alignItems: 'center', border: '1.5px solid currentColor', borderRadius: 6, display: 'flex', flex: 'none', justifyContent: 'center' }}
                      w={22}
                    >
                      <Icon name="check" size={14} stroke={2.6} />
                    </Box>
                    <Text fw={500} fz={{ base: 15, sm: 16 }} lh={1.7}>
                      {symptom}
                    </Text>
                  </Box>
                ))}
              </Stack>

              <Box mt={28} pt={24} style={{ borderTop: '1px dashed var(--st-line)' }}>
                <Text c="var(--st-accent-deep)" fw={700} fz={12} style={{ letterSpacing: '0.14em' }}>
                  {site.company.name}にできること
                </Text>
                <Text className="st-phrase" fz={{ base: 15, sm: 16 }} lh={1.95} mt={8}>
                  {trouble.work}
                </Text>
              </Box>

              <Button
                className="st-cta-ink"
                component="a"
                h={54}
                href={tel}
                leftSection={<Icon name="phone" size={20} />}
                maw="100%"
                mt={28}
                px={{ base: 18, sm: 26 }}
                radius="xl"
                styles={{ label: { fontSize: 'clamp(14px, 4vw, 17px)', letterSpacing: '0.03em' } }}
              >
                電話で相談する
              </Button>
            </Box>

            {photos.length > 0 && (
              <Stack gap={12}>
                {photos.map((photo) => (
                  <Box component="figure" key={photo.src} m={0}>
                    <Box className="st-shot" style={{ aspectRatio: '4 / 3' }}>
                      <GoogleImg photo={photo} />
                    </Box>
                    <Text c="var(--st-sub)" component="figcaption" fz={12} mt={6}>
                      {photo.note?.title}
                      {photo.note?.price && `｜${photo.note.price}`}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </Box>

      {menu.options.length > 0 && (
        <Box mt={{ base: 24, sm: 32 }} style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Text c="var(--st-accent-deep)" fw={700} fz={13} mr={6} style={{ letterSpacing: '0.12em' }}>
            一緒に頼めること
          </Text>
          {menu.options.map((option) => (
            <Text
              bg="white"
              fw={700}
              fz={{ base: 13, sm: 14 }}
              key={option}
              px={14}
              py={7}
              style={{ alignItems: 'center', border: '1px solid var(--st-line)', borderRadius: 999, display: 'inline-flex', gap: 6 }}
            >
              <Box c="var(--st-accent-deep)" component="span" style={{ display: 'inline-flex' }}>
                <Icon name="check" size={14} stroke={2.6} />
              </Box>
              {option}
            </Text>
          ))}
        </Box>
      )}
    </Section>
  )
}
