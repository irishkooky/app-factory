import { Box, Text } from '@mantine/core'
import { color, serif } from '../theme'
import { site } from '../site.config'

/** しずくのマーク（ご提案用のロゴ案）。favicon と OG 画像も同じ形 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 40 40" width={size} xmlns="http://www.w3.org/2000/svg">
      <rect fill={color.indigoSoft} height="40" rx="11" width="40" />
      <path
        d="M20 7.5c-4.6 6.1-8.3 10.4-8.3 15a8.3 8.3 0 0 0 16.6 0c0-4.6-3.7-8.9-8.3-15z"
        fill="none"
        stroke={color.brass}
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path d="M16.2 23.6a4 4 0 0 0 3.8 3.6" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  )
}

export function Logo({ dark, size = 'md' }: { dark?: boolean; size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <Box style={{ alignItems: 'center', display: 'flex', gap: lg ? 14 : 12 }}>
      <LogoMark size={lg ? 48 : 38} />
      <Box>
        <Text c={dark ? 'white' : 'black'} ff={serif} fw={800} fz={lg ? 26 : { base: 20, sm: 22 }} lh={1.15} style={{ letterSpacing: '0.1em' }}>
          {site.company.name}
        </Text>
        <Text c={dark ? 'rgba(255,255,255,0.6)' : 'dimmed'} fw={500} fz={10} lh={1.4} mt={3} style={{ letterSpacing: '0.16em' }}>
          {site.company.tagline}
        </Text>
      </Box>
    </Box>
  )
}
