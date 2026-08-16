import type { ReactNode } from 'react'
import { Stack, Text } from '@mantine/core'

type Props = {
  value: ReactNode
  label: string
  valueColor?: string
}

export function StatBlock({ value, label, valueColor }: Props) {
  return (
    <Stack gap={0}>
      <Text ff="monospace" fz={40} fw={700} lh={1} c={valueColor}>
        {value}
      </Text>
      <Text size="xs" c="dimmed" mt={6}>
        {label}
      </Text>
    </Stack>
  )
}
