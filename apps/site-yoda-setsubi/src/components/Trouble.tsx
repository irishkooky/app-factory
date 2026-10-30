import { useState } from 'react'
import { Box, Button, Group, Stack, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site, type Place } from '../site.config'
import { GoogleImg, useGooglePlace } from './GooglePlace'
import { tel } from './Header'
import { Icon } from './Icon'
import { Section } from './Section'

/** 困っている場所を選ぶと、よくある症状・できること・施工例が出る */
export function Trouble() {
  const [active, setActive] = useState<Place>(site.troubles[0].key)
  const { photosFor } = useGooglePlace()
  const trouble = site.troubles.find((t) => t.key === active) ?? site.troubles[0]
  const prices = site.prices.filter((p) => p.place === trouble.key)
  const photos = photosFor(trouble.key).slice(0, 2)

  return (
    <Section
      id="trouble"
      kicker="お困りごと"
      lead="場所を選ぶと、よくある症状と、依田設備でできることが分かります。当てはまるものがあれば、そのままお電話ください。"
      no="01"
      title="どこで、困っていますか？"
    >
      <Box className="yd-trouble">
        <div aria-label="困っている場所" className="yd-tabs" role="tablist">
          {site.troubles.map((t) => (
            <button
              aria-controls="trouble-panel"
              aria-selected={t.key === active}
              className="yd-tab"
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
          className="yd-panel"
          id="trouble-panel"
          key={trouble.key}
          p={{ base: 22, sm: 40 }}
          role="tabpanel"
          style={{ border: '1px solid var(--yd-line)', borderRadius: 18 }}
        >
          <Box className="yd-panel-grid" data-photos={photos.length > 0 || undefined}>
            <Box>
              <Group gap={12} wrap="nowrap">
                <Box
                  c="white"
                  h={48}
                  style={{ alignItems: 'center', background: 'var(--yd-indigo-soft)', borderRadius: 14, display: 'flex', flex: 'none', justifyContent: 'center' }}
                  w={48}
                >
                  <Icon name={trouble.icon} size={24} stroke={1.8} />
                </Box>
                <Title fz={{ base: 22, sm: 26 }} order={3}>
                  {trouble.label}の困りごと
                </Title>
              </Group>

              <Stack component="ul" gap={10} mt={24} p={0} style={{ listStyle: 'none' }}>
                {trouble.symptoms.map((symptom) => (
                  <Box component="li" key={symptom} style={{ alignItems: 'flex-start', display: 'flex', gap: 10 }}>
                    <Box
                      c="var(--yd-brass-deep)"
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

              <Box mt={28} pt={24} style={{ borderTop: '1px dashed var(--yd-line)' }}>
                <Text c="var(--yd-brass-deep)" fw={700} fz={12} style={{ letterSpacing: '0.14em' }}>
                  依田設備にできること
                </Text>
                <Text className="yd-phrase" fz={{ base: 15, sm: 16 }} lh={1.95} mt={8}>
                  {trouble.work}
                </Text>
              </Box>

              {prices.length > 0 && (
                <Group gap={10} mt={20}>
                  {prices.map((price) => (
                    <Box
                      key={price.title}
                      px={14}
                      py={8}
                      style={{ background: 'var(--yd-paper)', border: '1px solid var(--yd-line)', borderRadius: 10 }}
                    >
                      <Text c="var(--yd-sub)" component="span" fw={500} fz={12} mr={8}>
                        施工例｜{price.title}
                      </Text>
                      <Text component="span" ff={serif} fw={800} fz={18}>
                        {price.price}
                        <Box component="span" fz={12} ml={2}>
                          円
                        </Box>
                      </Text>
                    </Box>
                  ))}
                </Group>
              )}

              <Button
                className="yd-cta-ink"
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
                    <Box className="yd-shot" style={{ aspectRatio: '4 / 3' }}>
                      <GoogleImg photo={photo} />
                    </Box>
                    <Text c="var(--yd-sub)" component="figcaption" fz={12} mt={6}>
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
    </Section>
  )
}
