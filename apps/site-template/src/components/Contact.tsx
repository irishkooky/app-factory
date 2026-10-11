import { Anchor, Box, Button, Container, Group, Text, Title } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Icon } from './Icon'

export function Contact() {
  const { contact, company, about } = site

  return (
    <Box
      c="white"
      component="section"
      id="contact"
      style={{
        backgroundColor: 'var(--mantine-color-brand-9)',
        backgroundImage: about.photo
          ? `linear-gradient(rgba(25,40,30,0.88), rgba(25,40,30,0.92)), url(${about.photo.src})`
          : undefined,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <Container py={{ base: 80, sm: 120 }} size="md" ta="center">
        <Text fw={700} fz="xs" opacity={0.7} style={{ letterSpacing: '0.3em' }}>
          CONTACT
        </Text>
        <Title fz={{ base: 26, sm: 36 }} lh={1.5} mt={12} order={2}>
          まずは、お電話ください。
        </Title>
        <Text fz={{ base: 'sm', sm: 'md' }} lh={2} mt="lg" opacity={0.85}>
          {company.shortName}が直接お話を伺います。
          <br />
          お見積もり・現地の確認は無料です。
        </Text>

        <Button
          c="brand.8"
          color="white"
          component="a"
          h="auto"
          href={tel}
          leftSection={<Icon name="phone" size={30} />}
          mt={40}
          px={{ base: 28, sm: 44 }}
          py={20}
          radius="xl"
          styles={{ label: { fontSize: 'clamp(24px, 6vw, 34px)', letterSpacing: '0.04em' } }}
          variant="white"
        >
          {contact.phone}
        </Button>
        <Text fz="sm" mt="md" opacity={0.75}>
          受付 {contact.hours}
          {contact.holidays && `（${contact.holidays}を除く）`}
        </Text>

        {contact.email && (
          <Group justify="center" mt="xl">
            <Anchor c="white" href={`mailto:${contact.email}`} underline="always">
              <Group gap={8}>
                <Icon name="mail" size={20} />
                メールでのお問い合わせ（{contact.email}）
              </Group>
            </Anchor>
          </Group>
        )}
      </Container>
    </Box>
  )
}
