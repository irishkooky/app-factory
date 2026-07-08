import { Box, Center, Loader, Text, ThemeIcon } from '@app-factory/ui'

export const Basic = () => (
  <Box bg="gray.1" w={280} h={120}>
    <Center h="100%">
      <Text size="sm" c="dimmed">データがありません</Text>
    </Center>
  </Box>
)

export const WithLoader = () => (
  <Box bg="gray.0" w={280} h={120}>
    <Center h="100%">
      <Loader size="sm" />
    </Center>
  </Box>
)

export const WithIcon = () => (
  <Box bg="indigo.0" w={200} h={140}>
    <Center h="100%">
      <ThemeIcon size="xl" radius="xl">
        <Text size="lg">✓</Text>
      </ThemeIcon>
    </Center>
  </Box>
)
