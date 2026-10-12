import { Anchor, Box, Container, Group, Stack, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { navItems } from './Header'

export function Footer() {
  const { company, contact } = site

  return (
    <Box bg="#1d1c19" c="gray.5" component="footer">
      <Container py={{ base: 48, sm: 64 }} size="lg">
        <Group align="flex-start" justify="space-between" gap={40}>
          <Box>
            <Text c="white" ff={serif} fw={700} fz="xl">
              {company.name}
            </Text>
            <Text fz="sm" lh={1.9} mt="md">
              {contact.postalCode && `〒${contact.postalCode} `}
              {contact.address}
              <br />
              TEL {contact.phone}（受付 {contact.hours}）
            </Text>
          </Box>
          <Stack component="nav" gap={10}>
            {navItems.map((item) => (
              <Anchor c="gray.4" fz="sm" href={`#${item.id}`} key={item.id} underline="never">
                {item.title}
              </Anchor>
            ))}
          </Stack>
        </Group>
        <Text c="gray.6" fz="xs" mt={48}>
          © {new Date().getFullYear()} {company.name}
        </Text>
      </Container>
    </Box>
  )
}
