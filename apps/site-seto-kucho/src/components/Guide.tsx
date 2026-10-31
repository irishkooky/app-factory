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

/** 取り付けの絵。室内機から壁の穴を通って、室外機まで配管をつなぐ */
function Illustration() {
  return (
    <Box component="figure" m={0} style={{ alignSelf: 'center' }}>
      <svg aria-labelledby="install-title" role="img" style={{ display: 'block', height: 'auto', letterSpacing: 0, margin: '0 auto', maxWidth: 420, width: '100%' }} viewBox="0 0 360 300">
        <title id="install-title">エアコンの取り付け。室内機から壁の穴を通して、室外機まで配管をつなぐ</title>
        <rect fill="var(--st-paper)" height="300" rx="22" width="360" />
        {/* 外の地面 */}
        <path d="M190 254 H348" stroke="var(--st-line)" strokeWidth="3" />
        {/* 壁の断面 */}
        <rect fill="var(--st-paper-deep)" height="236" stroke="var(--st-line)" strokeWidth="1.5" width="20" x="170" y="20" />
        <text fill="var(--st-muted)" fontSize="12" fontWeight="700" x="24" y="270">
          部屋
        </text>
        <text fill="var(--st-muted)" fontSize="12" fontWeight="700" x="318" y="44">
          外
        </text>
        {/* 室内機 */}
        <rect fill="#fff" height="46" rx="12" stroke="var(--st-deep-soft)" strokeWidth="2.5" width="122" x="38" y="62" />
        <path d="M52 96 H146" stroke="var(--st-deep-soft)" strokeLinecap="round" strokeWidth="2" />
        <g fill="none" stroke="var(--st-accent-deep)" strokeLinecap="round" strokeWidth="2">
          <path d="M70 118 q-8 16 2 34" opacity="0.8" />
          <path d="M100 118 q-8 16 2 34" opacity="0.8" />
          <path d="M130 118 q-8 16 2 34" opacity="0.8" />
        </g>
        {/* 配管（化粧カバー） */}
        <path d="M160 84 H206 V222 H236" fill="none" stroke="var(--st-accent)" strokeLinejoin="round" strokeWidth="9" />
        <path d="M160 84 H206 V222 H236" fill="none" stroke="var(--st-accent-deep)" strokeDasharray="2 10" strokeLinejoin="round" strokeWidth="2" />
        {/* 室外機 */}
        <rect fill="#fff" height="62" rx="6" stroke="var(--st-deep-soft)" strokeWidth="2.5" width="100" x="236" y="190" />
        <circle cx="270" cy="221" fill="none" r="22" stroke="var(--st-deep-soft)" strokeWidth="2" />
        <g className="st-spin">
          <circle cx="270" cy="221" fill="none" r="18" />
          {[0, 120, 240].map((deg) => (
            <path d="M270 221 q4 -14 0 -18" fill="none" key={deg} stroke="var(--st-deep-soft)" strokeWidth="2.4" transform={`rotate(${deg} 270 221)`} />
          ))}
        </g>
        <path d="M304 200 V242 M314 200 V242 M324 200 V242" stroke="var(--st-line)" strokeWidth="2" />

        <Pill text="室内機" w={70} x={40} y={22} line="M75 48 V62" />
        <Pill text="壁の穴（スリーブ）" w={140} x={124} y={30} line="M180 56 V79" />
        <Pill text="配管" w={56} x={216} y={150} />
        <Pill text="室外機" w={70} x={251} y={262} line="M286 262 V252" />
      </svg>
      <Text c="var(--st-sub)" component="figcaption" fz={13} lh={1.8} mt={12} ta="center">
        室内機から壁の穴を通して、室外機まで配管をつなぎます。この通し方で、見た目も長持ちも変わります。
      </Text>
    </Box>
  )
}
