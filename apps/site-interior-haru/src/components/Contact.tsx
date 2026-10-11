import { Anchor, Box, Button, Container, Group, Text, Title } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Icon } from './Icon'

export function Contact() {
  const { contact, company } = site

  return (
    <Box bg="brand.8" c="white" component="section" id="contact">
      <Container py={{ base: 64, sm: 96 }} size="md" ta="center">
        <Text fw={700} fz="xs" opacity={0.7} style={{ letterSpacing: '0.25em' }}>
          CONTACT
        </Text>
        <Title fz={{ base: 24, sm: 30 }} mt={8} order={2}>
          お見積もり・ご相談はお気軽に
        </Title>
        <Text mt="md" opacity={0.8}>
          {company.shortName}が直接お話を伺います。
        </Text>

        <Button
          color="brand.8"
          component="a"
          fz={{ base: 24, sm: 30 }}
          h="auto"
          href={tel}
          leftSection={<Icon name="phone" size={28} />}
          mt={40}
          px={32}
          py={20}
          radius="lg"
          variant="white"
        >
          {contact.phone}
        </Button>
        <Text fz="sm" mt="sm" opacity={0.7}>
          受付 {contact.hours}
          {contact.holidays && `（${contact.holidays}を除く）`}
        </Text>

        {contact.email && (
          <Group justify="center" mt="xl">
            <Anchor c="white" href={`mailto:${contact.email}`} underline="always">
              <Group gap={8}>
                <Icon name="mail" size={20} />
                {contact.email}
              </Group>
            </Anchor>
          </Group>
        )}
      </Container>
    </Box>
  )
}
