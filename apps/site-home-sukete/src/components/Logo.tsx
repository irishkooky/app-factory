import { Box, Text } from '@mantine/core'
import { color, serif } from '../theme'
import { site } from '../site.config'

/** 家と「＋」（助っ人）のマーク（ご提案用のロゴ案）。favicon と OG 画像も同じ形 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 40 40" width={size} xmlns="http://www.w3.org/2000/svg">
      <rect fill={color.deepSoft} height="40" rx="11" width="40" />
      <path d="M9 19.5 20 10l11 9.5V30a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 9 30z" fill="none" stroke="#fff" strokeLinejoin="round" strokeWidth="2.4" />
      <path d="M20 19.5v8M16 23.5h8" stroke={color.accent} strokeLinecap="round" strokeWidth="3" />
    </svg>
  )
}

export function Logo({ dark, size = 'md' }: { dark?: boolean; size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <Box style={{ alignItems: 'center', display: 'flex', gap: lg ? 14 : 10 }}>
      <LogoMark size={lg ? 48 : 38} />
      <Box style={{ minWidth: 0 }}>
        <Text c={dark ? 'white' : 'black'} ff={serif} fw={900} fz={lg ? 22 : { base: 15, sm: 18 }} lh={1.2} style={{ letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          {site.company.name}
        </Text>
        <Text c={dark ? 'rgba(255,255,255,0.6)' : 'dimmed'} fw={500} fz={10} lh={1.4} mt={3} style={{ letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
          {site.company.tagline}
        </Text>
      </Box>
    </Box>
  )
}
