import { Box, Text } from '@app-factory/ui'

export const Basic = () => (
  <Box bg="indigo.1" p="md" style={{ borderRadius: 8 }}>
    <Text size="sm">Box に背景色とパディングを適用した状態</Text>
  </Box>
)

export const SizeSweep = () => (
  <Box>
    <Box bg="indigo.2" p="xs" w={160} mb="xs">
      <Text size="xs">w=160 / p="xs"</Text>
    </Box>
    <Box bg="indigo.4" p="lg" w={240} c="white">
      <Text size="xs">w=240 / p="lg"</Text>
    </Box>
  </Box>
)

export const BorderedPanel = () => (
  <Box
    p="md"
    style={{
      border: '1px solid var(--mantine-color-gray-4)',
      borderRadius: 8,
      background: 'var(--mantine-color-white)',
    }}
    w={280}
  >
    <Text fw={600} size="sm">配送状況</Text>
    <Text size="xs" c="dimmed" mt={4}>本日中にお届け予定です。</Text>
  </Box>
)
