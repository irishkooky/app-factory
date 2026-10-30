import { Box, SimpleGrid, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { GoogleImg, PhotoCredit, useGooglePlace } from './GooglePlace'
import { Section } from './Section'

/** 先方が Googleマップに載せている施工写真。施工前後がそろうものは並べて見せる */
export function Works() {
  const { photos, pairs } = useGooglePlace()
  if (!photos.length) return null

  const paired = new Set(pairs.flatMap((pair) => [pair.before.src, pair.after.src]))
  const rest = photos.filter((photo) => !paired.has(photo.src))

  return (
    <Section
      id="works"
      kicker="施工写真"
      lead={`${site.company.name}がGoogleマップに載せている、実際の仕事の写真です。写真に書き込まれた金額も、そのときの実際の金額です。`}
      no="02"
      title="仕事ぶりは、写真で。"
      tone="white"
    >
      {pairs.map((pair) => (
        <Box key={pair.after.src} mb={{ base: 28, md: 40 }}>
          <SimpleGrid cols={2} spacing={{ base: 8, sm: 20 }}>
            {[
              { photo: pair.before, label: '施工前' },
              { photo: pair.after, label: '施工後' },
            ].map(({ photo, label }) => (
              <Box component="figure" key={photo.src} m={0} pos="relative">
                <Box className="yd-shot" style={{ aspectRatio: '4 / 3' }}>
                  <GoogleImg alt={`${photo.note?.title ?? '施工'}（${label}）`} photo={photo} />
                </Box>
                <Text
                  c={label === '施工後' ? '#1d1408' : 'white'}
                  component="figcaption"
                  ff={serif}
                  fw={700}
                  fz={{ base: 12, sm: 15 }}
                  left={10}
                  pos="absolute"
                  px={{ base: 10, sm: 14 }}
                  py={{ base: 3, sm: 5 }}
                  style={{
                    background: label === '施工後' ? 'var(--yd-brass)' : 'rgba(15,38,56,0.82)',
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
          <Text className="yd-phrase" fw={700} fz={{ base: 15, sm: 17 }} mt={12}>
            {pair.after.note?.title}
            {pair.after.note?.detail && (
              <Text c="var(--yd-sub)" component="span" fw={500} fz={13} ml={10}>
                {pair.after.note.detail}
              </Text>
            )}
          </Text>
        </Box>
      ))}

      <div className="yd-masonry">
        {rest.map((photo) => (
          <figure key={photo.src}>
            <Box className="yd-shot" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
              <GoogleImg photo={photo} />
            </Box>
            {photo.note && (
              <Text c="var(--yd-sub)" className="yd-phrase" component="figcaption" fz={{ base: 12, sm: 13 }} lh={1.6} mt={8}>
                <Text c="black" component="span" fw={700}>
                  {photo.note.title}
                </Text>
                {photo.note.price && (
                  <Text c="var(--yd-brass-deep)" component="span" ff={serif} fw={800} ml={8} style={{ whiteSpace: 'nowrap' }}>
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
