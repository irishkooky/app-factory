import { Box, Text } from '@mantine/core'
import { color, serif } from '../theme'
import { site } from '../site.config'

/** 室外機と配管のマーク（ご提案用のロゴ案）。favicon と OG 画像も同じ形 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 40 40" width={size} xmlns="http://www.w3.org/2000/svg">
      <rect fill={color.deepSoft} height="40" rx="11" width="40" />
      <rect fill="none" height="20" rx="3" stroke="#fff" strokeWidth="2.2" width="22" x="6" y="12" />
      <circle cx="15" cy="22" fill="none" r="5.5" stroke={color.accent} strokeWidth="2.2" />
      <path d="M15 17.5v9M10.5 22h9" stroke={color.accent} strokeLinecap="round" strokeWidth="1.6" />
      <path d="M28 17h4a2 2 0 0 1 2 2v11" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M28 24h2" stroke="#fff" strokeLinecap="round" strokeWidth="2.2" />
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
