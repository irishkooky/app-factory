import { Box, Button, Container, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { tel } from './Header'
import { Icon } from './Icon'
import { OpenNow } from './OpenNow'

export function Contact() {
  const { contact, company } = site

  return (
    <Box className="st-hero" component="section" id="contact">
      <Container pos="relative" py={{ base: 88, sm: 128 }} size="md" ta="center">
        <Text c="var(--st-accent)" fw={700} fz={13} style={{ letterSpacing: '0.2em' }}>
          お問い合わせ
        </Text>
        <Title c="white" fz={{ base: 30, sm: 44 }} lh={1.45} mt={14} order={2} style={{ whiteSpace: 'pre-line' }}>
          {site.contactTitle}
        </Title>
        <Text c="rgba(255,255,255,0.8)" fz={{ base: 15, sm: 17 }} lh={2} mt={20}>
          {company.name}が、直接お話をうかがいます。
        </Text>

        <Button
          className="st-cta"
          component="a"
          h={{ base: 72, sm: 84 }}
          href={tel}
          leftSection={<Icon name="phone" size={30} />}
          mt={40}
          px={{ base: 28, sm: 48 }}
          radius="xl"
          styles={{ label: { fontFamily: serif, fontSize: 'clamp(26px, 7vw, 36px)', fontWeight: 700, letterSpacing: '0.05em' } }}
        >
          {contact.phone}
        </Button>
        <Box mt={20}>
          <OpenNow tone="light" />
        </Box>
        <Text c="rgba(255,255,255,0.7)" fz={14} lh={1.9} mt={8}>
          {contact.hours && (
            <>
              受付 {contact.hours}
              <br />
            </>
          )}
          {contact.callTip}
        </Text>
      </Container>
    </Box>
  )
}
