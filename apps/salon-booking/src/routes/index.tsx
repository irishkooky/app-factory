import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import {
  Alert,
  Avatar,
  Badge,
  Card,
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { api } from '../../convex/_generated/api'
import { MENU_CATEGORIES, formatPrice } from '../../convex/lib'
import { ButtonLink } from '../components/app-link'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const ALL_CATEGORY = 'すべて'

function HomeComponent() {
  const { data: menus } = useSuspenseQuery(convexQuery(api.menus.listActive, {}))
  const { data: stylists } = useSuspenseQuery(convexQuery(api.stylists.listActive, {}))

  const [category, setCategory] = useState<string>(ALL_CATEGORY)

  const filteredMenus = useMemo(
    () => (category === ALL_CATEGORY ? menus : menus.filter((m) => m.category === category)),
    [menus, category],
  )

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Card withBorder radius="lg" padding="xl" bg="orange.0">
          <Stack gap="sm">
            <Group gap="xs">
              {['表参道駅 徒歩3分', '半個室あり', '当日予約OK', '駐車場あり'].map((badge) => (
                <Badge key={badge} color="orange" variant="light">
                  {badge}
                </Badge>
              ))}
            </Group>
            <Title order={1}>SALON LUMIÈRE（サロン ルミエール）</Title>
            <Text size="lg" c="dimmed">
              あなたの&ldquo;なりたい&rdquo;を叶える、表参道のプライベートサロン
            </Text>
            <Group gap={6}>
              <Text fw={700} c="orange.7">
                ★ 4.8
              </Text>
              <Text size="sm" c="dimmed">
                （口コミ312件）
              </Text>
            </Group>
            <ButtonLink to="/reserve" size="lg" w={{ base: '100%', sm: 240 }}>
              予約する
            </ButtonLink>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg">
          <Title order={3} mb="sm">
            店舗情報
          </Title>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Th w={140}>営業時間</Table.Th>
                <Table.Td>10:00〜19:00</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>定休日</Table.Th>
                <Table.Td>火曜日</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>住所</Table.Th>
                <Table.Td>東京都渋谷区神宮前X-X-X ルミエールビル2F（架空の住所です）</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>電話</Table.Th>
                <Table.Td>03-XXXX-XXXX（架空の電話番号です）</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>

        <Stack gap="md">
          <Title order={2}>クーポン・メニュー</Title>
          <SegmentedControl
            value={category}
            onChange={setCategory}
            data={[ALL_CATEGORY, ...MENU_CATEGORIES]}
            fullWidth
          />

          {menus.length === 0 ? (
            <Alert color="orange" variant="light">
              メニュー準備中です。しばらくお待ちください。
            </Alert>
          ) : filteredMenus.length === 0 ? (
            <Text c="dimmed">このカテゴリのメニューはありません。</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {filteredMenus.map((menu) => (
                <Card key={menu._id} withBorder radius="md" padding="lg">
                  <Stack gap={6}>
                    <Group justify="space-between" wrap="nowrap">
                      <Badge color="orange" variant="light">
                        {menu.category}
                      </Badge>
                      <Badge color="gray" variant="outline">
                        約{menu.durationMinutes}分
                      </Badge>
                    </Group>
                    <Text fw={700} size="lg">
                      {menu.name}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {menu.description}
                    </Text>
                    <Group justify="space-between" align="flex-end" mt="xs">
                      <Text fw={800} fz={26} c="red.7">
                        {formatPrice(menu.price)}
                      </Text>
                      <ButtonLink to="/reserve" search={{ menuId: menu._id }}>
                        このメニューで予約
                      </ButtonLink>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Stack>

        <Stack gap="md">
          <Title order={2}>スタイリスト紹介</Title>
          {stylists.length === 0 ? (
            <Alert color="orange" variant="light">
              スタイリスト情報を準備中です。
            </Alert>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              {stylists.map((stylist) => (
                <Card key={stylist._id} withBorder radius="md" padding="lg">
                  <Stack gap={6} align="center" ta="center">
                    <Avatar color={stylist.avatarColor} radius="xl" size={64}>
                      {stylist.name.slice(0, 1)}
                    </Avatar>
                    <Text fw={700}>{stylist.name}</Text>
                    <Text size="sm" c="dimmed">
                      {stylist.role}
                    </Text>
                    <Text size="sm">{stylist.bio}</Text>
                    <ButtonLink
                      to="/reserve"
                      search={{ stylistId: stylist._id }}
                      variant="light"
                      fullWidth
                    >
                      このスタイリストで予約
                    </ButtonLink>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Stack>
    </Container>
  )
}
