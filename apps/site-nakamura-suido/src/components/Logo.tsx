import { Box, Text } from '@mantine/core'
import { color, serif } from '../theme'
import { site } from '../site.config'

/** しずくと配管のマーク（ご提案用のロゴ案）。favicon と OG 画像も同じ形 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 40 40" width={size} xmlns="http://www.w3.org/2000/svg">
      <rect fill={color.deepSoft} height="40" rx="11" width="40" />
      <path d="M8 13h13a4 4 0 0 1 4 4v2" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="3" />
      <path d="M25 22.5c2.8 3.6 4.2 6 4.2 7.6a4.2 4.2 0 0 1-8.4 0c0-1.6 1.4-4 4.2-7.6z" fill={color.accent} />
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
