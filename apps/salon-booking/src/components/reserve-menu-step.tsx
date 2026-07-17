import { Badge, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { formatPrice } from '../../convex/lib'

export function ReserveMenuStep({
  menus,
  selectedMenuId,
  onSelect,
}: {
  menus: Doc<'menus'>[]
  selectedMenuId: Id<'menus'> | undefined
  onSelect: (id: Id<'menus'>) => void
}) {
  if (menus.length === 0) {
    return <Text c="dimmed">現在ご予約可能なメニューがありません。</Text>
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {menus.map((menu) => {
        const selected = menu._id === selectedMenuId
        return (
          <Card
            key={menu._id}
            withBorder
            radius="md"
            padding="lg"
            onClick={() => onSelect(menu._id)}
            bg={selected ? 'orange.0' : undefined}
            style={{
              cursor: 'pointer',
              borderColor: selected ? 'var(--mantine-color-orange-6)' : undefined,
              borderWidth: selected ? 2 : 1,
            }}
          >
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
              <Text fw={800} fz={22} c="red.7">
                {formatPrice(menu.price)}
              </Text>
            </Stack>
          </Card>
        )
      })}
    </SimpleGrid>
  )
}
