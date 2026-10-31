import { Anchor, Box, Stack, Text, Title } from '@mantine/core'
import { display } from '../theme'
import { site } from '../site.config'
import { Icon } from './Icon'
import { Section } from './Section'

/** 業種の役立ち情報。セルフチェック、ご自分でできること、知っておくと得なこと */
export function Guide() {
  const { guide } = site

  return (
    <Section id="guide" kicker={guide.kicker} lead={guide.lead} title={guide.title} tone="white">
      <Box className="st-guide-grid">
        <Box>
          <Stack className="st-steps" gap={0}>
            {guide.checks.map((check) => (
              <Box key={check.title} py={{ base: 20, sm: 24 }} style={{ display: 'flex', gap: 18 }}>
                <Box
                  c="var(--st-accent-deep)"
                  h={40}
                  style={{ alignItems: 'center', border: '1.5px solid var(--st-accent)', borderRadius: 12, display: 'flex', flex: 'none', justifyContent: 'center' }}
                  w={40}
                >
                  <Icon name="check" size={20} stroke={2.6} />
                </Box>
                <Box>
                  <Title fz={{ base: 18, sm: 20 }} lh={1.55} order={3}>
                    {check.title}
                  </Title>
                  <Text c="var(--st-sub)" className="st-phrase" fz={{ base: 15, sm: 16 }} lh={1.9} mt={6}>
                    {check.description}
                  </Text>
                </Box>
              </Box>
            ))}
          </Stack>

          <Box
            mt={{ base: 16, sm: 24 }}
            p={{ base: 20, sm: 24 }}
            style={{ background: 'color-mix(in srgb, var(--st-accent) 12%, #fff)', border: '1px solid color-mix(in srgb, var(--st-accent) 45%, #fff)', borderRadius: 16, display: 'flex', gap: 14 }}
          >
            <Box c="var(--st-accent-deep)" mt={2} style={{ flex: 'none' }}>
              <Icon name="sparkle" size={22} />
            </Box>
            <Box>
              <Text fw={700} fz={{ base: 16, sm: 17 }}>
                {guide.tip.title}
              </Text>
              <Text className="st-phrase" fz={{ base: 15, sm: 16 }} lh={1.9} mt={6}>
                {guide.tip.body}
              </Text>
            </Box>
          </Box>
        </Box>

        <Illustration />
      </Box>

      <Box className="st-side" mt={{ base: 40, sm: 56 }}>
        <Box>
          <Text c="var(--st-accent)" fw={700} fz={12} style={{ letterSpacing: '0.14em' }}>
            {guide.side.kicker}
          </Text>
          <Title c="white" fz={{ base: 22, sm: 28 }} lh={1.5} mt={10} order={3}>
            {guide.side.title}
          </Title>
          <Stack gap={12} mt={16}>
            {guide.side.body.map((line) => (
              <Text c="rgba(255,255,255,0.84)" className="st-phrase" fz={{ base: 15, sm: 16 }} key={line} lh={1.95}>
                {line}
              </Text>
            ))}
          </Stack>
        </Box>

        <Box
          p={{ base: 22, sm: 28 }}
          style={{ alignSelf: 'start', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--st-accent-rgb),0.4)', borderRadius: 16 }}
        >
          <Box c="var(--st-accent)">
            <Icon name="chat" size={28} stroke={1.6} />
          </Box>
          <Text c="white" fw={700} fz={16} lh={1.8} mt={12}>
            {guide.side.note}
          </Text>
          <Stack gap={8} mt={14}>
            {guide.side.links.map((link) => (
              <Anchor
                c="var(--st-accent)"
                fw={700}
                fz={13}
                href={link.href}
                key={link.href}
                rel="noopener"
                style={{ alignItems: 'center', display: 'inline-flex', gap: 6 }}
                target="_blank"
              >
                {link.label}
                <Icon name="external" size={13} />
              </Anchor>
            ))}
          </Stack>
        </Box>
      </Box>
    </Section>
  )
}

/** 名前の札 */
function Pill({ x, y, w, text, line }: { x: number; y: number; w: number; text: string; line?: string }) {
  return (
    <g>
      {line && <path d={line} stroke="var(--st-accent-deep)" strokeWidth="1.4" />}
      <rect fill="var(--st-deep-soft)" height="26" rx="13" width={w} x={x} y={y} />
      <text fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle" x={x + w / 2} y={y + 17}>
        {text}
      </text>
    </g>
  )
}

/** 熱割れの絵。日が当たる真ん中と、サッシに隠れた端の温度の差で、端からヒビが入る */
function Illustration() {
  return (
    <Box component="figure" m={0} style={{ alignSelf: 'center' }}>
      <svg aria-labelledby="crack-title" role="img" style={{ display: 'block', height: 'auto', letterSpacing: 0, margin: '0 auto', maxWidth: 420, width: '100%' }} viewBox="0 0 360 300">
        <title id="crack-title">熱割れ。日が当たって温まる真ん中と、サッシに隠れて冷たい端の温度の差で、端からヒビが入る</title>
        <defs>
          <radialGradient cx="50%" cy="42%" id="warm" r="62%">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--st-accent) 75%, #fff)" />
            <stop offset="70%" stopColor="color-mix(in srgb, var(--st-accent) 18%, #fff)" />
            <stop offset="100%" stopColor="#e3eef6" />
          </radialGradient>
        </defs>
        <rect fill="var(--st-paper)" height="300" rx="22" width="360" />
        {/* 太陽と日差し */}
        <circle cx="318" cy="40" fill="var(--st-accent)" r="16" />
        <g stroke="var(--st-accent)" strokeLinecap="round" strokeWidth="2.5">
          <path d="M296 58 L262 84" />
          <path d="M300 70 L274 104" />
          <path d="M288 50 L248 70" />
        </g>
        {/* サッシ */}
        <rect fill="var(--st-deep-soft)" height="214" rx="8" width="220" x="54" y="56" />
        {/* ガラス（真ん中が温かい） */}
        <rect fill="url(#warm)" height="190" rx="3" width="196" x="66" y="68" />
        {/* サッシに隠れた端（冷たい） */}
        <rect fill="none" height="182" rx="2" stroke="#9cc3e0" strokeDasharray="4 5" strokeWidth="3" width="188" x="70" y="72" />
        {/* ヒビ（端から） */}
        <path d="M66 214 L96 206 L108 186 L132 180 L144 160" fill="none" stroke="var(--st-ink)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
        <path d="M108 186 L104 166" fill="none" stroke="var(--st-ink)" strokeLinecap="round" strokeWidth="1.8" />

        <Pill text="日が当たって温まる" w={146} x={92} y={128} />
        <Pill text="サッシの中は冷たいまま" w={170} x={150} y={274} line="M235 274 V258" />
        <Pill text="ヒビは端から" w={104} x={6} y={232} line="M58 232 L70 216" />
      </svg>
      <Text c="var(--st-sub)" component="figcaption" fz={13} lh={1.8} mt={12} ta="center">
        温まった真ん中がふくらもうとし、冷たい端がそれを押さえるので、端から割れます（日本板硝子の解説をもとに作図）。
      </Text>
    </Box>
  )
}
