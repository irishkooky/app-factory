import { Box, SimpleGrid, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { GoogleImg, PhotoCredit, useGooglePlace } from './GooglePlace'
import { Section } from './Section'

/** 先方とお客さまが Googleマップに載せている作業写真。作業前後がそろうものは並べて見せる */
export function Works() {
  const { photos, pairs } = useGooglePlace()
  if (!photos.length) return null

  const paired = new Set(pairs.flatMap((pair) => [pair.before.src, pair.after.src]))
  const rest = photos.filter((photo) => !paired.has(photo.src) && !photo.note?.hide)

  return (
    <Section
      id="works"
      kicker="作業写真"
      lead={`${site.company.name}とお客さまがGoogleマップに載せている、実際の作業の写真です。`}
      title="仕事ぶりは、写真で。"
      tone="white"
    >
      {pairs.map((pair) => (
        <Box key={pair.after.src} mb={{ base: 28, md: 40 }}>
          <SimpleGrid cols={2} spacing={{ base: 8, sm: 20 }}>
            {[
              { photo: pair.before, label: '作業前' },
              { photo: pair.after, label: '作業後' },
            ].map(({ photo, label }) => (
              <Box component="figure" key={photo.src} m={0} pos="relative">
                <Box className="st-shot" style={{ aspectRatio: '4 / 3' }}>
                  <GoogleImg alt={`${photo.note?.title ?? '作業'}（${label}）`} photo={photo} />
                </Box>
                <Text
                  c={label === '作業後' ? 'var(--st-accent-ink)' : 'white'}
                  component="figcaption"
                  ff={serif}
                  fw={700}
                  fz={{ base: 12, sm: 15 }}
                  left={10}
                  pos="absolute"
                  px={{ base: 10, sm: 14 }}
                  py={{ base: 3, sm: 5 }}
                  style={{
                    background: label === '作業後' ? 'var(--st-accent)' : 'color-mix(in srgb, var(--st-deep) 82%, transparent)',
                    borderRadius: 999,
                    letterSpacing: '0.1em',
                  }}
                  top={10}
                >
                  {label}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
          <Text className="st-phrase" fw={700} fz={{ base: 15, sm: 17 }} mt={12}>
            {pair.after.note?.title}
            {pair.after.note?.detail && (
              <Text c="var(--st-sub)" component="span" fw={500} fz={13} ml={10}>
                {pair.after.note.detail}
              </Text>
            )}
          </Text>
        </Box>
      ))}

      <div className="st-masonry">
        {rest.map((photo) => (
          <figure key={photo.src}>
            <Box className="st-shot" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
              <GoogleImg photo={photo} />
            </Box>
            {photo.note && (
              <Text c="var(--st-sub)" className="st-phrase" component="figcaption" fz={{ base: 12, sm: 13 }} lh={1.6} mt={8}>
                <Text c="black" component="span" fw={700}>
                  {photo.note.title}
                </Text>
                {photo.note.price && (
                  <Text c="var(--st-accent-deep)" component="span" ff={serif} fw={800} ml={8} style={{ whiteSpace: 'nowrap' }}>
                    {photo.note.price}
                  </Text>
                )}
              </Text>
            )}
          </figure>
        ))}
      </div>

      <Box mt={8}>
        <PhotoCredit photos={photos} />
      </Box>
    </Section>
  )
}
