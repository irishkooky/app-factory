import { createFileRoute } from '@tanstack/react-router'
import { Alert, Container, Stack, Tabs, Title } from '@mantine/core'
import { AdminReservationsTab } from '../components/admin-reservations-tab'
import { AdminMenusTab } from '../components/admin-menus-tab'
import { AdminStylistsTab } from '../components/admin-stylists-tab'

export const Route = createFileRoute('/admin')({
  component: AdminComponent,
})

function AdminComponent() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={1}>管理画面</Title>
        <Alert color="orange" variant="light">
          これはデモ用管理画面です。認証は実装していません。
        </Alert>

        <Tabs defaultValue="reservations" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="reservations">予約管理</Tabs.Tab>
            <Tabs.Tab value="menus">メニュー管理</Tabs.Tab>
            <Tabs.Tab value="stylists">スタイリスト管理</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="reservations" pt="lg">
            <AdminReservationsTab />
          </Tabs.Panel>
          <Tabs.Panel value="menus" pt="lg">
            <AdminMenusTab />
          </Tabs.Panel>
          <Tabs.Panel value="stylists" pt="lg">
            <AdminStylistsTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  )
}
