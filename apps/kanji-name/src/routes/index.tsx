import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Button, Group, Stack, Text, TextInput } from '@mantine/core'
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
        `<text x="${item.x}" y="${item.y}" text-anchor="middle" dominant-baseline="central" font-size="${mark.fontSize}" fill="#fff8f2" font-family="serif">${xml(item.char)}</text>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%"><rect width="320" height="320" fill="#fff4ee"/><g transform="rotate(-2.5 160 160)"><rect x="36" y="40" width="248" height="248" rx="10" fill="#b81d32"/><rect x="28" y="32" width="248" height="248" rx="10" fill="#d7263d"/><rect x="46" y="50" width="212" height="212" fill="none" stroke="#fff4ee" stroke-width="3"/>${glyphs}</g></svg>`
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
  const [press, setPress] = useState(0)
  const result = sealFor(raw, shifts)
  const chars = result.ok ? result.seal.glyphs.map((glyph) => glyph.kanji) : ['印']

  function stamp(next: string) {
    setRaw(next)
    setShifts([])
    setPress((value) => value + 1)
  }

  async function onDownload() {
    if (!result.ok) return
    saveBlob(await sealPng(chars), `${result.seal.name}-hanko.png`)
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
    <Box mih="100vh" bg="#fff4ee" c="#1a120f" px="md" py="lg">
      <style>{`@keyframes press{0%{transform:scale(1.35) rotate(-10deg);opacity:0}70%{transform:scale(.96) rotate(-2deg);opacity:1}100%{transform:scale(1) rotate(-2.5deg)}}`}</style>
      <Stack gap="md" maw={420} mx="auto">
        <Text size="xs" tt="uppercase" fw={700} c="#b42318" style={{ letterSpacing: '0.16em' }}>
          A seal, not a translation
        </Text>
        <Group justify="space-between" align="flex-end" wrap="nowrap" gap={8}>
          <Text fz={34} fw={750} lh={0.95} style={{ minWidth: 0 }}>
            Stamp
            <br />
            your name
          </Text>
          <Box key={press} w={132} h={132} style={{ animation: 'press .48s cubic-bezier(.2,1.4,.4,1)', flex: '0 0 132px' }} dangerouslySetInnerHTML={{ __html: sealMarkup(chars) }} />
        </Group>

        <TextInput
          aria-label="Your name"
          size="xl"
          radius="lg"
          value={raw}
          placeholder="Priya"
          onChange={(event) => stamp(event.currentTarget.value)}
          styles={{ input: { fontSize: 28, height: 64, border: '2px solid #1a120f', background: '#fff' } }}
        />

        <Group gap={8}>
          {SAMPLES.map((sample) => (
            <Button key={sample} radius="xl" size="md" variant={raw === sample ? 'filled' : 'outline'} color="dark" onClick={() => stamp(sample)}>
              {sample}
            </Button>
          ))}
        </Group>

        {result.ok ? (
          <>
            <Text fz={28} fw={700} lh={1}>
              {result.seal.reading}
            </Text>
            <Group gap={8} align="stretch">
              {result.seal.glyphs.map((glyph, index) => (
                <Button
                  key={`${glyph.reading}-${index}`}
                  variant="white"
                  onClick={() => {
                    const next = shifts.slice()
                    next[index] = (next[index] ?? 0) + 1
                    setShifts(next)
                    setPress((value) => value + 1)
                  }}
                  aria-label={`Another kanji for ${glyph.reading}`}
                  styles={{ root: { height: 'auto', padding: '10px 8px', border: '1px solid #ecdcd4', flex: 1 } }}
                >
                  <Stack gap={0} align="center">
                    <Text fz={32} fw={700} lh={1} ff="serif">
                      {glyph.kanji}
                    </Text>
                    <Text size="xs" c="#8a7368">
                      {glyph.meaning}
                    </Text>
                  </Stack>
                </Button>
              ))}
            </Group>
            <Group grow>
              <Button size="lg" color="red" onClick={() => void onDownload()}>
                Save the seal
              </Button>
              <Button size="lg" variant="outline" color="dark" onClick={() => void onShare()}>
                Share
              </Button>
            </Group>
          </>
        ) : (
          <Text>Type a name in Latin letters.</Text>
        )}

        <details>
          <summary style={{ cursor: 'pointer', color: '#8a7368' }}>This is playful ateji, not a legal name.</summary>
          <Text size="sm" c="#6d5c52" mt={6}>
            Tap a character for another positive kanji. The same spelling keeps the same seal until you do.
          </Text>
        </details>
        <Footer current="kanji-name" />
      </Stack>
    </Box>
  )
}
