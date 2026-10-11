import type { ReactNode } from 'react'
import { Box, Container, Text, Title } from '@mantine/core'

type Props = {
  id: string
  /** 英字の小見出し（例: SERVICE） */
  eyebrow: string
  title: string
  /** 見出しの下の短い説明 */
  lead?: string
  soft?: boolean
  center?: boolean
  children: ReactNode
}

export function Section({ id, eyebrow, title, lead, soft, center, children }: Props) {
  return (
    <Box bg={soft ? 'brand.0' : 'white'} component="section" id={id}>
      <Container py={{ base: 72, sm: 112 }} size="lg">
        <Box maw={center ? 640 : 720} mx={center ? 'auto' : undefined} ta={center ? 'center' : undefined}>
          <Text c="accent" fw={700} fz="xs" style={{ letterSpacing: '0.3em' }}>
            {eyebrow}
          </Text>
          <Title fz={{ base: 26, sm: 34 }} lh={1.5} mt={12} order={2}>
            {title}
          </Title>
          {lead && (
            <Text c="gray.7" lh={1.9} mt="md">
              {lead}
            </Text>
          )}
        </Box>
        <Box mt={{ base: 40, sm: 64 }}>{children}</Box>
      </Container>
    </Box>
  )
}
