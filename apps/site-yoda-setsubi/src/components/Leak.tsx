import { Anchor, Box, Stack, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Icon } from './Icon'
import { Section } from './Section'

/** 漏水のセルフチェック、水が噴き出したときの止め方、横浜市の減額制度 */
export function Leak() {
  const { leak, credentials } = site
  const listing = credentials[1]

  return (
    <Section
      id="leak"
      kicker="漏水かもしれないとき"
      lead="見えないところで、水が漏れているかもしれません。水道メーターで、ご自分でも確かめられます。"
      no="05"
      title="水道代が、急に上がったら。"
      tone="white"
    >
      <Box className="yd-leak-grid">
        <Box>
          <Stack className="yd-steps" gap={0}>
            {leak.steps.map((step, i) => (
              <Box key={step.title} py={{ base: 20, sm: 24 }} style={{ display: 'flex', gap: 18 }}>
                <Box
                  c="var(--yd-brass-deep)"
                  ff={serif}
                  fw={800}
                  fz={15}
                  h={44}
                  style={{ alignItems: 'center', border: '1.5px solid var(--yd-brass)', borderRadius: 999, display: 'flex', flex: 'none', justifyContent: 'center' }}
                  w={44}
                >
                  {i + 1}
                </Box>
                <Box>
                  <Title fz={{ base: 19, sm: 21 }} lh={1.5} order={3}>
                    {step.title}
                  </Title>
                  <Text c="var(--yd-sub)" className="yd-phrase" fz={{ base: 15, sm: 16 }} lh={1.9} mt={6}>
                    {step.description}
                  </Text>
                </Box>
              </Box>
            ))}
          </Stack>

          <Box
            mt={{ base: 16, sm: 24 }}
            p={{ base: 20, sm: 24 }}
            style={{ background: '#fff7ec', border: '1px solid #f0d2ad', borderRadius: 16, display: 'flex', gap: 14 }}
          >
            <Box c="#c25b28" mt={2} style={{ flex: 'none' }}>
              <Icon name="alert" size={22} />
            </Box>
            <Box>
              <Text fw={700} fz={{ base: 16, sm: 17 }}>
                水が噴き出しているときは
              </Text>
              <Text className="yd-phrase" fz={{ base: 15, sm: 16 }} lh={1.9} mt={6}>
                {leak.emergency}
              </Text>
            </Box>
          </Box>
        </Box>

        <Meter />
      </Box>

      <Box className="yd-reduction" mt={{ base: 40, sm: 56 }}>
        <Box>
          <Text c="var(--yd-brass)" fw={700} fz={12} style={{ letterSpacing: '0.14em' }}>
            直したあとの手続き
          </Text>
          <Title c="white" fz={{ base: 22, sm: 28 }} lh={1.5} mt={10} order={3}>
            水道料金が、減額されることがあります。
          </Title>
          <Stack gap={12} mt={16}>
            {leak.reduction.map((line) => (
              <Text c="rgba(255,255,255,0.84)" className="yd-phrase" fz={{ base: 15, sm: 16 }} key={line} lh={1.95}>
                {line}
              </Text>
            ))}
          </Stack>
          <Text c="rgba(255,255,255,0.6)" fz={12} lh={1.8} mt={14}>
            ※ {leak.reductionNote}
            <Anchor c="var(--yd-brass)" href={leak.reductionHref} ml={6} rel="noopener" target="_blank" underline="always">
              横浜市水道局の案内
            </Anchor>
          </Text>
        </Box>

        <Box
          p={{ base: 22, sm: 28 }}
          style={{ alignSelf: 'start', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(226,173,110,0.4)', borderRadius: 16 }}
        >
          <Box c="var(--yd-brass)">
            <Icon name="list" size={28} stroke={1.6} />
          </Box>
          <Text c="white" fw={700} fz={16} lh={1.7} mt={12}>
            {site.company.name}は、横浜市水道局の「{listing.title}」に載っている指定工事店です。
          </Text>
          <Anchor
            c="var(--yd-brass)"
            fw={700}
            fz={13}
            href={listing.href}
            mt={12}
            rel="noopener"
            style={{ alignItems: 'center', display: 'inline-flex', gap: 6 }}
            target="_blank"
          >
            リストを見る（横浜市水道局）
            <Icon name="external" size={13} />
          </Anchor>
        </Box>
      </Box>
    </Section>
  )
}

/** 水道メーターの絵。パイロット（銀色のコマ）が回る様子で、どこを見ればよいかを示す */
function Meter() {
  return (
    <Box component="figure" m={0} style={{ alignSelf: 'center' }}>
      <svg aria-labelledby="meter-title" role="img" style={{ display: 'block', height: 'auto', margin: '0 auto', maxWidth: 380, width: '100%' }} viewBox="0 0 320 300">
        <title id="meter-title">水道メーターのパイロット（銀色のコマ）の位置</title>
        <rect fill="#efe9df" height="236" rx="22" stroke="#e0d6c6" width="300" x="10" y="20" />
        <rect fill="#b0733a" height="22" rx="4" width="46" x="10" y="127" />
        <rect fill="#b0733a" height="22" rx="4" width="46" x="264" y="127" />
        <circle cx="160" cy="138" fill="#d9a465" r="96" />
        <circle cx="160" cy="138" fill="#c58b4b" r="86" />
        <circle cx="160" cy="138" fill="#fff" r="78" stroke="#8a5628" strokeWidth="2" />
        <rect fill="#13202b" height="30" rx="5" width="112" x="104" y="88" />
        {['0', '2', '5', '8'].map((digit, i) => (
          <text fill="#fff" fontFamily="monospace" fontSize="21" fontWeight="700" key={digit} textAnchor="middle" x={120 + i * 27} y="110">
            {digit}
          </text>
        ))}
        {[118, 148].map((x) => (
          <g key={x}>
            <circle cx={x} cy="150" fill="none" r="11" stroke="#c0392b" strokeWidth="1.5" />
            <path d={`M${x} 150 l0 -8`} stroke="#c0392b" strokeLinecap="round" strokeWidth="2" />
          </g>
        ))}
        <g className="yd-pilot">
          <circle cx="196" cy="152" fill="#eef1f4" r="15" stroke="#7d8790" strokeWidth="1.5" />
          <path d="M196 139 l3.2 8.2 8.8 0.5 -6.8 5.6 2.3 8.5 -7.5 -4.8 -7.5 4.8 2.3 -8.5 -6.8 -5.6 8.8 -0.5z" fill="#a9b3bc" stroke="#5f6a73" strokeLinejoin="round" strokeWidth="1" />
        </g>
        <path d="M212 160 C 240 190, 250 214, 262 236" fill="none" stroke="#b0733a" strokeDasharray="3 4" strokeWidth="1.5" />
        <rect fill="#163450" height="34" rx="17" width="136" x="174" y="236" />
        <text fill="#fff" fontSize="15" fontWeight="700" textAnchor="middle" x="242" y="258">
          パイロット
        </text>
      </svg>
      <Text c="var(--yd-sub)" component="figcaption" fz={13} lh={1.8} mt={12} ta="center">
        水を使っていないのに、銀色のコマが回っていたら漏水のサインです。
      </Text>
    </Box>
  )
}
