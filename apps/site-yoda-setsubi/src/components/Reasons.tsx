import { Anchor, Box, Stack, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Stars, useGooglePlace } from './GooglePlace'
import { Icon } from './Icon'
import { Section } from './Section'

/** 選ばれる理由。クチコミに書かれていることを、こちらの言葉で要約して根拠として添える */
export function Reasons() {
  const { rating, count, reviewsUri } = useGooglePlace()

  return (
    <Section
      id="reasons"
      kicker="選ばれる理由"
      lead={`Googleマップに寄せられた${count}件のクチコミの平均は★${rating.toFixed(1)}。そこに書かれていることを、4つにまとめました。`}
      no="04"
      title={`★${rating.toFixed(1)}の理由は、\nクチコミにありました。`}
      tone="dark"
    >
      <Box className="yd-reasons-grid">
        <Box className="yd-reasons-side">
          <Box p={{ base: 24, sm: 32 }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20 }}>
            <Text c="rgba(255,255,255,0.7)" fw={700} fz={12} style={{ letterSpacing: '0.12em' }}>
              Googleマップの評価
            </Text>
            <Text c="white" ff={serif} fw={800} fz={84} lh={1} mt={10}>
              {rating.toFixed(1)}
            </Text>
            <Box mt={12}>
              <Stars size={22} />
            </Box>
            <Text c="rgba(255,255,255,0.8)" fz={14} mt={10}>
              クチコミ {count}件
            </Text>
            <Anchor
              c="var(--yd-brass)"
              fw={700}
              fz={14}
              href={reviewsUri}
              mt={20}
              rel="noopener"
              style={{ alignItems: 'center', display: 'inline-flex', gap: 6 }}
              target="_blank"
            >
              Googleマップでクチコミを読む
              <Icon name="external" size={14} />
            </Anchor>
          </Box>
        </Box>

        <Box>
          {site.reasons.map((reason, i) => (
            <Box className="yd-reason" key={reason.title} py={{ base: 28, sm: 36 }}>
              <Box style={{ alignItems: 'baseline', display: 'flex', gap: 14 }}>
                <Text c="var(--yd-brass)" ff={serif} fw={700} fz={15}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text
                  c="var(--yd-brass)"
                  fw={700}
                  fz={12}
                  px={10}
                  py={2}
                  style={{ border: '1px solid rgba(226,173,110,0.45)', borderRadius: 999, letterSpacing: '0.12em' }}
                >
                  {reason.label}
                </Text>
              </Box>
              <Title c="white" fz={{ base: 23, sm: 28 }} lh={1.5} mt={14} order={3}>
                {reason.title}
              </Title>
              <Text c="rgba(255,255,255,0.8)" className="yd-phrase" fz={{ base: 15, sm: 16 }} lh={2} mt={12}>
                {reason.body}
              </Text>
              <Stack gap={8} mt={18}>
                {reason.evidence.map((line) => (
                  <Box key={line} style={{ alignItems: 'flex-start', display: 'flex', gap: 10 }}>
                    <Box c="var(--yd-brass)" mt={3} style={{ flex: 'none' }}>
                      <Icon name="star" size={13} />
                    </Box>
                    <Text c="rgba(255,255,255,0.68)" fz={13} lh={1.8}>
                      {line}
                    </Text>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
          <Text c="rgba(255,255,255,0.5)" fz={11} lh={1.8} mt={8}>
            ★の行は、Googleマップのクチコミに書かれていることを当方で要約したものです（原文ではありません）。
          </Text>
        </Box>
      </Box>
    </Section>
  )
}
