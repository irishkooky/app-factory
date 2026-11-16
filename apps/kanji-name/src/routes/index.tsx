import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Button, Group, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { Footer } from '../footer'
import { layoutSeal, sealFor } from '../domain'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const SAMPLES = ['Priya', 'Arjun', 'Aisha', 'Yoshihiro']

function SealArt({ chars }: { chars: readonly string[] }) {
  const mark = layoutSeal(chars.length ? chars : ['印'])
  return (
    <svg viewBox="0 0 320 320" width="100%" height="100%" role="img" aria-label="Name seal">
      <defs>
        <filter id="stamp-edge" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" />
        </filter>
        <filter id="ink-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="3" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.02  0 0 0 0 0.04  0 0 0 0.45 0" />
        </filter>
      </defs>
      <g opacity="0.28" filter="url(#stamp-edge)" transform="translate(14 16) rotate(-6 150 150)">
        <rect x="36" y="36" width="230" height="230" fill="#5c0d14" />
      </g>
      <g filter="url(#stamp-edge)" transform="rotate(-4 160 166)">
        <rect x="28" y="34" width="246" height="246" fill="#c81d2b" />
        <rect x="46" y="52" width="210" height="210" fill="none" stroke="#f6efe4" strokeWidth="7" />
        <rect x="28" y="34" width="246" height="246" filter="url(#ink-grain)" />
        {[
          [58, 70], [90, 48], [140, 60], [200, 52], [246, 78], [70, 120], [250, 140],
          [64, 190], [248, 200], [80, 246], [150, 250], [210, 242], [170, 100], [110, 210],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.2" fill="#7d121c" opacity="0.55" />
        ))}
      </g>
      <g transform="rotate(-4 160 166)">
        {mark.chars.map((item) => (
          <text
            key={`${item.char}-${item.y}`}
            x={item.x}
            y={item.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff8f2"
            fontSize={mark.fontSize}
            fontFamily="serif"
            fontWeight="700"
          >
            {item.char}
          </text>
        ))}
      </g>
    </svg>
  )
}

function paintCard(name: string, reading: string, chars: readonly string[]): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('canvas unavailable'))
  ctx.fillStyle = '#f3eadf'
  ctx.fillRect(0, 0, 1080, 1350)
  const mark = layoutSeal(chars)
  ctx.save()
  ctx.translate(540, 700)
  ctx.rotate(-0.07)
  ctx.fillStyle = '#5c0d14'
  ctx.globalAlpha = 0.22
  ctx.fillRect(-220, -200, 470, 490)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#c81d2b'
  ctx.fillRect(-250, -250, 500, 500)
  ctx.strokeStyle = '#f6efe4'
  ctx.lineWidth = 14
  ctx.strokeRect(-210, -210, 420, 420)
  ctx.fillStyle = '#fff8f2'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${mark.fontSize * 1.55}px serif`
  for (const item of mark.chars) {
    ctx.fillText(item.char, (item.x - 160) * 1.55, (item.y - 160) * 1.55)
  }
  ctx.restore()
  ctx.fillStyle = '#6e121c'
  ctx.font = '700 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('A NAME SEAL', 540, 120)
  ctx.fillStyle = '#1a120f'
  ctx.font = '700 72px sans-serif'
  ctx.fillText(name, 540, 210)
  ctx.font = '600 40px sans-serif'
  ctx.fillStyle = '#8a5a52'
  ctx.fillText(reading, 540, 270)
  ctx.font = '28px sans-serif'
  ctx.fillStyle = '#6d534c'
  ctx.fillText('A playful seal · Yoshihiro Kurosaki, Tokyo', 540, 1260)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png unavailable'))), 'image/png')
  })
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

  async function onShare() {
    if (!result.ok) return
    const png = await paintCard(result.seal.name, result.seal.reading, chars)
    const file = new File([png], `${result.seal.name}-hanko.png`, { type: 'image/png' })
    const payload = { files: [file], title: result.seal.reading, text: `${result.seal.name} ${result.seal.reading}` }
    if (typeof navigator.share === 'function' && navigator.canShare?.(payload)) {
      await navigator.share(payload)
      return
    }
    saveBlob(png, file.name)
  }

  return (
    <Box mih="100vh" bg="#6e121c" px={12} py={12} style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes ink{0%{transform:translateY(-48px) scale(1.12) rotate(-11deg);opacity:0}40%{opacity:1}70%{transform:translateY(6px) scale(.96) rotate(-2deg)}100%{transform:translateY(0) scale(1) rotate(-4deg)}}`}</style>
      <Box bg="#f4eadf" c="#1a120f" bdrs={20} px="md" pt="md" pb="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Text size="xs" tt="uppercase" fw={700} c="#9d1c28" ta="center" style={{ letterSpacing: '0.22em' }}>
          A name seal
        </Text>
        <Box style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', minHeight: 0, paddingBottom: 4 }}>
          <Box key={press} w="100%" maw={320} style={{ aspectRatio: '1', animation: 'ink .6s cubic-bezier(.2,1.4,.3,1)' }}>
            <SealArt chars={chars} />
          </Box>
        </Box>
        {result.ok ? (
          <Text ta="center" fz={28} fw={700} lh={1}>
            {result.seal.reading}
          </Text>
        ) : (
          <Text ta="center">Latin letters, as on a passport.</Text>
        )}
        <TextInput
          aria-label="Your name"
          mt="xs"
          size="md"
          radius="md"
          value={raw}
          placeholder="Priya"
          onChange={(event) => stamp(event.currentTarget.value)}
          styles={{ input: { fontSize: 20, height: 48, border: '1.5px solid #1a120f', background: '#fffaf4', textAlign: 'center' } }}
        />
        <Group gap={8} justify="center" mt={8}>
          {SAMPLES.map((sample) => (
            <UnstyledButton
              key={sample}
              onClick={() => stamp(sample)}
              fw={700}
              c={raw === sample ? '#9d1c28' : '#6d534c'}
              style={{ borderBottom: raw === sample ? '2px solid #9d1c28' : '2px solid transparent' }}
            >
              {sample}
            </UnstyledButton>
          ))}
        </Group>
        {result.ok && (
          <Group gap={8} justify="center" mt={6}>
            {result.seal.glyphs.map((glyph, index) => (
              <UnstyledButton
                key={`${glyph.reading}-${index}`}
                onClick={() => {
                  const next = shifts.slice()
                  next[index] = (next[index] ?? 0) + 1
                  setShifts(next)
                  setPress((value) => value + 1)
                }}
                aria-label={`Another kanji for ${glyph.reading}, ${glyph.meaning}`}
              >
                <Text size="xs" c="#6d534c">
                  {glyph.kanji} {glyph.meaning}
                </Text>
              </UnstyledButton>
            ))}
          </Group>
        )}
        <Button mt="sm" size="md" color="red" radius="xl" onClick={() => void onShare()}>
          Save this card
        </Button>
      </Box>
      <Box px={4}>
        <Footer current="kanji-name" light />
      </Box>
    </Box>
  )
}
