import { Box, Container, Text } from '@mantine/core'
import { site } from '../site.config'

export function Footer() {
  const { company, contact } = site

  return (
    <Box bg="dark.9" c="gray.5" component="footer">
      <Container fz="sm" py={40} size="lg">
        <Text c="white" fw={700}>
          {company.name}
        </Text>
        <Text fz="sm" mt={8}>
          {contact.postalCode && `〒${contact.postalCode} `}
          {contact.address}
        </Text>
        <Text fz="sm" mt={4}>
          TEL {contact.phone}
        </Text>
        <Text c="gray.6" fz="xs" mt="lg">
          © {new Date().getFullYear()} {company.name}
        </Text>
      </Container>
    </Box>
  )
}
