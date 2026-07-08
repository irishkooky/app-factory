import { Badge, Stack, Switch, Tabs, Text, TextInput, Title } from '@app-factory/ui'

export const Basic = () => (
  <Tabs defaultValue="profile" maw={420}>
    <Tabs.List>
      <Tabs.Tab value="profile">プロフィール</Tabs.Tab>
      <Tabs.Tab value="notifications">通知</Tabs.Tab>
      <Tabs.Tab value="security">セキュリティ</Tabs.Tab>
    </Tabs.List>

    <Tabs.Panel value="profile" pt="md">
      <Stack gap="sm">
        <Title order={4}>プロフィール設定</Title>
        <TextInput label="表示名" defaultValue="黒崎 佳弘" />
        <TextInput label="メールアドレス" defaultValue="yoshihiro.kurosaki.15@gmail.com" />
      </Stack>
    </Tabs.Panel>

    <Tabs.Panel value="notifications" pt="md">
      <Stack gap="sm">
        <Title order={4}>通知設定</Title>
        <Switch label="デプロイ完了メール" defaultChecked />
        <Switch label="ビルド失敗の通知" defaultChecked />
        <Switch label="週次サマリー" />
      </Stack>
    </Tabs.Panel>

    <Tabs.Panel value="security" pt="md">
      <Stack gap="sm">
        <Title order={4}>セキュリティ</Title>
        <Text size="sm" c="dimmed">
          最終ログイン: 2026-07-06 08:41（東京）
        </Text>
        <Badge color="teal" variant="light">
          2段階認証: 有効
        </Badge>
      </Stack>
    </Tabs.Panel>
  </Tabs>
)

export const Pills = () => (
  <Tabs defaultValue="all" variant="pills" maw={420}>
    <Tabs.List>
      <Tabs.Tab value="all">すべて</Tabs.Tab>
      <Tabs.Tab value="running">稼働中</Tabs.Tab>
      <Tabs.Tab value="stopped">停止中</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel value="all" pt="md">
      <Text size="sm">全12アプリを表示しています。</Text>
    </Tabs.Panel>
    <Tabs.Panel value="running" pt="md">
      <Text size="sm">9アプリが稼働中です。</Text>
    </Tabs.Panel>
    <Tabs.Panel value="stopped" pt="md">
      <Text size="sm">3アプリが停止中です。</Text>
    </Tabs.Panel>
  </Tabs>
)
