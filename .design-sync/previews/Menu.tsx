import { Button, Menu } from '@app-factory/ui'

export const Actions = () => (
  <Menu opened withinPortal={false} transitionProps={{ duration: 0 }}>
    <Menu.Target>
      <Button>操作</Button>
    </Menu.Target>
    <Menu.Dropdown>
      <Menu.Label>アカウント</Menu.Label>
      <Menu.Item>プロフィールを編集</Menu.Item>
      <Menu.Item>請求情報を確認</Menu.Item>
      <Menu.Divider />
      <Menu.Item color="red">アカウントを削除</Menu.Item>
    </Menu.Dropdown>
  </Menu>
)
