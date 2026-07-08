import { Box, Container, Paper, Stack, Text, Title } from '@app-factory/ui'

export const Basic = () => (
  <Box w={800}>
    <Container size="sm" w="100%" style={{ background: 'var(--mantine-color-indigo-0)' }} py="md">
      <Stack gap="xs">
        <Title order={4}>お知らせ</Title>
        <Text size="sm">メンテナンスは7月10日 深夜2時〜4時を予定しています。</Text>
      </Stack>
    </Container>
  </Box>
)

export const SizeSweep = () => (
  <Box w={800}>
    <Stack gap="sm">
      <Container size="xs" w="100%" style={{ background: 'var(--mantine-color-gray-1)' }} py="xs">
        <Text size="sm" ta="center">size="xs"（最大幅 444px）</Text>
      </Container>
      <Container size="md" w="100%" style={{ background: 'var(--mantine-color-gray-1)' }} py="xs">
        <Text size="sm" ta="center">size="md"（最大幅 720px）</Text>
      </Container>
    </Stack>
  </Box>
)

export const CardInside = () => (
  <Box w={800}>
    <Container size="xs" w="100%" py="lg">
      <Paper withBorder radius="md" p="md">
        <Title order={5}>アカウント設定</Title>
        <Text size="sm" c="dimmed" mt={4}>
          プロフィール情報や通知設定を変更できます。
        </Text>
      </Paper>
    </Container>
  </Box>
)
