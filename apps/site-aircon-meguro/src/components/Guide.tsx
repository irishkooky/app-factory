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

/** エアコンの中の絵。カビやほこりがたまりやすい場所を示す */
function Illustration() {
  const label = { fill: 'var(--st-ink)', fontSize: 14, fontWeight: 700 } as const
  return (
    <Box component="figure" m={0} style={{ alignSelf: 'center' }}>
      <svg aria-labelledby="aircon-title" role="img" style={{ display: 'block', height: 'auto', letterSpacing: 0, margin: '0 auto', maxWidth: 420, width: '100%' }} viewBox="0 0 360 300">
        <title id="aircon-title">エアコンの中で、カビやほこりがたまりやすい場所</title>
        {/* 壁 */}
        <rect fill="var(--st-paper)" height="300" rx="22" width="360" />
        {/* 本体の断面 */}
        <path d="M40 46 h280 a18 18 0 0 1 18 18 v86 a40 40 0 0 1 -40 40 h-236 a20 20 0 0 1 -20 -20 v-106 a18 18 0 0 1 18 -18z" fill="#fff" stroke="var(--st-deep-soft)" strokeWidth="2.5" />
        {/* フィルター */}
        <path d="M58 64 h244" stroke="var(--st-muted)" strokeDasharray="3 4" strokeWidth="2" />
        {/* 熱交換器（フィン） */}
        <g stroke="var(--st-deep-soft)" strokeWidth="1.6">
          {Array.from({ length: 22 }, (_, i) => (
            <path d={`M${80 + i * 9} 76 l-14 56`} key={i} opacity={0.75} />
          ))}
        </g>
        {/* ファン（回る） */}
        <g className="st-spin">
          <circle cx="180" cy="152" fill="none" r="26" stroke="var(--st-deep-soft)" strokeWidth="2" />
          {Array.from({ length: 12 }, (_, i) => (
            <path d="M180 126 q6 10 0 20" fill="none" key={i} stroke="var(--st-deep-soft)" strokeWidth="1.6" transform={`rotate(${i * 30} 180 152)`} />
          ))}
        </g>
        {/* カビの点 */}
        {[
          [96, 104],
          [130, 96],
          [172, 140],
          [190, 162],
          [164, 166],
          [226, 112],
          [88, 176],
          [116, 182],
        ].map(([x, y]) => (
          <circle cx={x} cy={y} fill="#3a4a3f" key={`${x}-${y}`} opacity={0.55} r={3.2} />
        ))}
        {/* 水受け（ドレンパン） */}
        <path d="M66 172 h80 v14 h-80z" fill="color-mix(in srgb, var(--st-accent) 30%, #fff)" stroke="var(--st-deep-soft)" strokeWidth="1.6" />
        {/* 吹き出し口と風 */}
        <path d="M200 190 h100" stroke="var(--st-deep-soft)" strokeWidth="2.5" />
        <g fill="none" stroke="var(--st-accent-deep)" strokeLinecap="round" strokeWidth="2">
          <path d="M220 206 q20 18 10 44" />
          <path d="M250 206 q20 18 10 44" />
          <path d="M280 206 q20 18 10 44" />
        </g>

        {/* 名前の札 */}
        <g>
          <path d="M150 76 L150 24" stroke="var(--st-accent-deep)" strokeWidth="1.4" />
          <rect fill="var(--st-deep-soft)" height="26" rx="13" width="140" x="138" y="8" />
          <text fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle" x="208" y="25">
            熱交換器（フィン）
          </text>
        </g>
        <g>
          <path d="M206 152 L300 152" stroke="var(--st-accent-deep)" strokeWidth="1.4" />
          <rect fill="var(--st-deep-soft)" height="26" rx="13" width="64" x="288" y="139" />
          <text fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle" x="320" y="156">
            ファン
          </text>
        </g>
        <g>
          <path d="M106 186 L106 236" stroke="var(--st-accent-deep)" strokeWidth="1.4" />
          <rect fill="var(--st-deep-soft)" height="26" rx="13" width="152" x="30" y="234" />
          <text fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle" x="106" y="251">
            水受け（ドレンパン）
          </text>
        </g>
        <text {...label} fill="var(--st-muted)" fontSize="12" x="60" y="60">
          フィルター
        </text>
        <text fill="var(--st-accent-deep)" fontFamily={display} fontSize="12" fontWeight="700" x="236" y="282">
          吹き出し口
        </text>
      </svg>
      <Text c="var(--st-sub)" component="figcaption" fz={13} lh={1.8} mt={12} ta="center">
        黒い点は、カビやほこりがたまりやすい場所。フィルターの奥にあるので、ご自分では届きません。
      </Text>
    </Box>
  )
}
