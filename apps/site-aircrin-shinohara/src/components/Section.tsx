import type { ReactNode } from 'react'
import { Box, Container, Text, Title } from '@mantine/core'
import { display } from '../theme'

type Props = {
  id: string
  /** 番号の横の短い見出し（例: お困りごと） */
  kicker: string
  title: string
  lead?: ReactNode
  /** 背景。paper は紙色、white は白、dark は濃い色の帯 */
  tone?: 'paper' | 'white' | 'dark'
  /** 見出しの右側に置くもの（大きい画面だけ横並び） */
  aside?: ReactNode
  children: ReactNode
}

export function Section({ id, kicker, title, lead, tone = 'paper', aside, children }: Props) {
  const dark = tone === 'dark'
  return (
    <Box
      bg={dark ? undefined : tone === 'white' ? 'white' : 'var(--st-paper)'}
      className={dark ? 'st-sec st-band' : 'st-sec'}
      component="section"
      id={id}
    >
      <Container py={{ base: 76, sm: 120 }} size="lg">
        <Box style={{ alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between' }}>
          <Box maw={720}>
            <Text c={dark ? 'var(--st-accent)' : 'var(--st-accent-deep)'} className="st-kicker" component="p" fw={700} fz={13} style={{ letterSpacing: '0.18em' }}>
              {/* 番号は CSS の counter で振る（出さない区切りがあっても飛ばない） */}
              <Box className="st-no" component="span" ff={display} fw={700} fz={15} style={{ letterSpacing: '0.06em' }} />
              {kicker}
            </Text>
            <Title c={dark ? 'white' : 'black'} fz={{ base: 28, sm: 38 }} lh={1.45} mt={14} order={2} style={{ whiteSpace: 'pre-line' }}>
              {title}
            </Title>
            {lead && (
              <Text c={dark ? 'rgba(255,255,255,0.78)' : 'var(--st-sub)'} className="st-phrase" fz={{ base: 15, sm: 16 }} lh={2} mt={18}>
                {lead}
              </Text>
            )}
          </Box>
          {aside}
        </Box>
        <Box mt={{ base: 40, sm: 60 }}>{children}</Box>
      </Container>
    </Box>
  )
}
