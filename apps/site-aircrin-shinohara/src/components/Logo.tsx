import { Box, Text } from '@mantine/core'
import { color, serif } from '../theme'
import { site } from '../site.config'

/** 3枚羽根のファンのマーク（ご提案用のロゴ案）。favicon と OG 画像も同じ形 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 40 40" width={size} xmlns="http://www.w3.org/2000/svg">
      <rect fill={color.deepSoft} height="40" rx="11" width="40" />
      <g fill="#fff">
        {[0, 120, 240].map((deg) => (
          <path d="M20 20c-1.5-5.5 0.5-10.5 5-11.5 3.2-0.7 4.6 2.6 2.4 4.9-2.2 2.3-4.7 3.9-7.4 6.6z" key={deg} transform={`rotate(${deg} 20 20)`} />
        ))}
      </g>
      <circle cx="20" cy="20" fill={color.accent} r="3.2" />
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
