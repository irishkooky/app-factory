import type { ReactNode } from 'react'
import { Box, Container, Text, Title } from '@mantine/core'

type Props = {
  id: string
  /** 英字の小見出し（例: SERVICE） */
  eyebrow: string
  title: string
  soft?: boolean
  children: ReactNode
}

export function Section({ id, eyebrow, title, soft, children }: Props) {
  return (
    <Box bg={soft ? 'brand.0' : 'white'} component="section" id={id}>
      <Container py={{ base: 64, sm: 96 }} size="lg">
        <Text c="brand" fw={700} fz="xs" style={{ letterSpacing: '0.25em' }}>
          {eyebrow}
        </Text>
        <Title fz={{ base: 24, sm: 30 }} mt={8} order={2}>
          {title}
        </Title>
        <Box mt={{ base: 40, sm: 48 }}>{children}</Box>
      </Container>
    </Box>
  )
}
