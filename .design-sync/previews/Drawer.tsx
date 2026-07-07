import { Box, Button, Drawer, Stack, Switch, Text, TextInput, Title } from '@app-factory/ui'

// The in-flow sized Box gives the card's containing block real height —
// Drawer is position:fixed and resolves its percentage height against it
// (the bare Drawer collapses to 0 inside the zero-height single-card wrapper).
export const Settings = () => (
  <Box h={560} w="100%" bg="gray.0" p="lg">
    <Title order={4}>アプリ一覧</Title>
    <Text c="dimmed" size="sm" mt="xs">
      ドロワーの背後に表示されるページコンテンツ
    </Text>
    <Drawer
      opened
      onClose={() => {}}
      title="表示設定"
      withinPortal={false}
      transitionProps={{ duration: 0 }}
    >
      <Stack gap="md">
        <TextInput label="表示名" defaultValue="黒崎 好弘" />
        <Switch label="ダークモードを使用する" defaultChecked />
        <Switch label="通知を受け取る" />
        <Button mt="sm">保存する</Button>
      </Stack>
    </Drawer>
  </Box>
)
