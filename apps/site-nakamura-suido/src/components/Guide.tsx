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

/** 水道メーターの絵。パイロットが回っていたら漏れている */
function Illustration() {
  return (
    <Box component="figure" m={0} style={{ alignSelf: 'center' }}>
      <svg aria-labelledby="meter-title" role="img" style={{ display: 'block', height: 'auto', letterSpacing: 0, margin: '0 auto', maxWidth: 420, width: '100%' }} viewBox="0 0 360 300">
        <title id="meter-title">水道メーターのパイロット。水を使っていないのに回っていたら、どこかで漏れている</title>
        <rect fill="var(--st-paper)" height="300" rx="22" width="360" />
        {/* メーターボックス */}
        <rect fill="var(--st-paper-deep)" height="170" rx="16" stroke="var(--st-line)" strokeWidth="2" width="300" x="30" y="78" />
        {/* 水道管 */}
        <path d="M30 172 H330" stroke="var(--st-deep-soft)" strokeLinecap="round" strokeWidth="12" />
        <path d="M30 172 H330" stroke="color-mix(in srgb, var(--st-deep-soft) 60%, #fff)" strokeDasharray="3 12" strokeWidth="3" />
        {/* 止水栓 */}
        <rect fill="#fff" height="30" rx="6" stroke="var(--st-deep-soft)" strokeWidth="2.5" width="30" x="70" y="157" />
        <path d="M85 157 V138 M73 138 H97" stroke="var(--st-deep-soft)" strokeLinecap="round" strokeWidth="4" />
        <path d="M66 128 a22 22 0 0 1 38 0" fill="none" markerEnd="url(#arrow)" stroke="var(--st-accent-deep)" strokeWidth="2" />
        <defs>
          <marker id="arrow" markerHeight="8" markerWidth="8" orient="auto" refX="4" refY="4">
            <path d="M0 0 L8 4 L0 8 z" fill="var(--st-accent-deep)" />
          </marker>
        </defs>
        {/* メーター */}
        <circle cx="210" cy="168" fill="#fff" r="58" stroke="var(--st-deep-soft)" strokeWidth="3" />
        <rect fill="var(--st-paper-deep)" height="22" rx="4" width="64" x="178" y="128" />
        <text fill="var(--st-ink)" fontFamily={display} fontSize="15" fontWeight="700" letterSpacing="3" textAnchor="middle" x="210" y="145">
          0246
        </text>
        <g className="st-spin">
          <path d="M0 -11 L3 -3.5 L11 -3.5 L4.5 1.5 L7 9.5 L0 4.5 L-7 9.5 L-4.5 1.5 L-11 -3.5 L-3 -3.5 Z" fill="var(--st-accent)" stroke="var(--st-accent-deep)" strokeLinejoin="round" strokeWidth="1.5" transform="translate(210 186)" />
        </g>
        <circle cx="210" cy="186" fill="none" r="16" stroke="var(--st-accent)" strokeDasharray="3 4" strokeWidth="1.5" />

        <Pill text="水道メーター" w={104} x={158} y={36} line="M210 62 V110" />
        <Pill text="パイロット" w={92} x={250} y={222} line="M270 222 L222 196" />
        <Pill text="止水栓" w={70} x={50} y={212} line="M85 212 V187" />
        <text fill="var(--st-accent-deep)" fontSize="12" fontWeight="700" textAnchor="middle" x="85" y="112">
          右に回すと止まる
        </text>
      </svg>
      <Text c="var(--st-sub)" component="figcaption" fz={13} lh={1.8} mt={12} ta="center">
        水を使っていないのにパイロットが回っていたら、メーターから蛇口までのどこかで漏れています。
      </Text>
    </Box>
  )
}
