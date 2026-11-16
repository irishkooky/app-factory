import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Button, Container, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { Footer } from '../footer'
import { layoutSeal, sealFor } from '../domain'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const SAMPLES = ['Priya', 'Arjun', 'Aisha', 'Yoshihiro']

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function sealMarkup(chars: readonly string[]): string {
  const mark = layoutSeal(chars)
  const glyphs = mark.chars
    .map(
      (item) =>
        `<text x="${item.x}" y="${item.y}" text-anchor="middle" dominant-baseline="central" font-size="${mark.fontSize}" fill="#fff7ef" font-family="serif">${xml(item.char)}</text>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="Name seal"><rect width="320" height="320" fill="#f4efe6"/><rect x="28" y="28" width="264" height="264" rx="18" fill="#c4272f"/><rect x="42" y="42" width="236" height="236" rx="8" fill="none" stroke="#f4efe6" stroke-width="3"/>${glyphs}</svg>`
}

async function sealPng(chars: readonly string[]): Promise<Blob> {
  const blob = new Blob([sealMarkup(chars)], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 640
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unavailable')
    ctx.drawImage(image, 0, 0, 640, 640)
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!png) throw new Error('png unavailable')
    return png
  } finally {
    URL.revokeObjectURL(url)
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function HomeComponent() {
  const [raw, setRaw] = useState('Priya')
  const [shifts, setShifts] = useState<number[]>([])
  const result = sealFor(raw, shifts)
  const chars = result.ok ? result.seal.glyphs.map((glyph) => glyph.kanji) : []

  async function onDownload() {
    if (!result.ok) return
    const png = await sealPng(chars)
    saveBlob(png, `${result.seal.name}-hanko.png`)
  }

  async function onShare() {
    if (!result.ok) return
    const png = await sealPng(chars)
    const file = new File([png], `${result.seal.name}-hanko.png`, { type: 'image/png' })
    const payload = { files: [file], title: result.seal.reading, text: `${result.seal.name} ${result.seal.reading}` }
    if (typeof navigator.share === 'function' && navigator.canShare?.(payload)) {
      await navigator.share(payload)
      return
    }
    saveBlob(png, file.name)
  }

  return (
    <Box mih="100vh" bg="#f6f3ee">
      <Container size="sm" px="md" py="lg">
        <Stack gap="lg">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              A seal for the name you just said
            </Text>
            <Title order={1}>Kanji Name Maker</Title>
            <Text>
              Type a name in Latin letters. You get the katakana a Japanese ear hears, a playful kanji seal, and the meaning of each character. It is ateji, a game, not a legal name.
            </Text>
          </Stack>

          <TextInput
            label="Your name"
            size="lg"
            value={raw}
            onChange={(event) => {
              setRaw(event.currentTarget.value)
              setShifts([])
            }}
            placeholder="Priya"
          />

          <Group gap="xs">
            {SAMPLES.map((sample) => (
              <Button
                key={sample}
                variant="default"
                size="sm"
                onClick={() => {
                  setRaw(sample)
                  setShifts([])
                }}
              >
                {sample}
              </Button>
            ))}
          </Group>

          {result.ok ? (
            <Stack gap="md">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Katakana
                </Text>
                <Title order={2}>{result.seal.reading}</Title>
              </Stack>

              <Group gap="xs" align="stretch">
                {result.seal.glyphs.map((glyph, index) => (
                  <Button
                    key={`${glyph.reading}-${index}`}
                    variant="default"
                    onClick={() => {
                      const next = shifts.slice()
                      next[index] = (next[index] ?? 0) + 1
                      setShifts(next)
                    }}
                    styles={{ root: { height: 'auto', paddingBlock: 12 } }}
                    aria-label={`Another kanji for ${glyph.reading}`}
                  >
                    <Stack gap={0} align="center">
                      <Text fz={28} fw={600} lh={1.1}>
                        {glyph.kanji}
                      </Text>
                      <Text size="xs">{glyph.reading}</Text>
                      <Text size="xs" c="dimmed">
                        {glyph.meaning}
                      </Text>
                    </Stack>
                  </Button>
                ))}
              </Group>
              <Text size="sm" c="dimmed">
                Tap a character for another positive kanji. The same name keeps the same seal until you do.
              </Text>

              <Box
                maw={280}
                mx="auto"
                w="100%"
                dangerouslySetInnerHTML={{ __html: sealMarkup(chars) }}
              />

              <Stack gap="xs">
                <Button size="lg" fullWidth onClick={() => void onDownload()}>
                  Download stamp
                </Button>
                <Button size="lg" fullWidth variant="default" onClick={() => void onShare()}>
                  Share
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Text>
              {result.reason === 'empty'
                ? 'Type a name to see the seal.'
                : 'Use Latin letters, the way the name is written in a passport.'}
            </Text>
          )}

          <Footer current="kanji-name" />
        </Stack>
      </Container>
    </Box>
  )
}
