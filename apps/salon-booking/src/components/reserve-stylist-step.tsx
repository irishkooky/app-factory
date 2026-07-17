import { Avatar, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import type { Doc, Id } from '../../convex/_generated/dataModel'

export type StylistChoice = Id<'stylists'> | 'none'

export function ReserveStylistStep({
  stylists,
  selected,
  onSelect,
}: {
  stylists: Doc<'stylists'>[]
  selected: StylistChoice | undefined
  onSelect: (choice: StylistChoice) => void
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Card
        withBorder
        radius="md"
        padding="lg"
        onClick={() => onSelect('none')}
        bg={selected === 'none' ? 'orange.0' : undefined}
        style={{
          cursor: 'pointer',
          borderColor: selected === 'none' ? 'var(--mantine-color-orange-6)' : undefined,
          borderWidth: selected === 'none' ? 2 : 1,
        }}
      >
        <Group>
          <Avatar radius="xl" size={48} color="gray">
            ?
          </Avatar>
          <Stack gap={0}>
            <Text fw={700}>指名なし</Text>
            <Text size="sm" c="dimmed">
              どのスタイリストでもOK
            </Text>
          </Stack>
        </Group>
      </Card>

      {stylists.map((stylist) => {
        const isSelected = selected === stylist._id
        return (
          <Card
            key={stylist._id}
            withBorder
            radius="md"
            padding="lg"
            onClick={() => onSelect(stylist._id)}
            bg={isSelected ? 'orange.0' : undefined}
            style={{
              cursor: 'pointer',
              borderColor: isSelected ? 'var(--mantine-color-orange-6)' : undefined,
              borderWidth: isSelected ? 2 : 1,
            }}
          >
            <Group wrap="nowrap" align="flex-start">
              <Avatar color={stylist.avatarColor} radius="xl" size={48}>
                {stylist.name.slice(0, 1)}
              </Avatar>
              <Stack gap={0}>
                <Text fw={700}>{stylist.name}</Text>
                <Text size="sm" c="dimmed">
                  {stylist.role}
                </Text>
                <Text size="sm">{stylist.bio}</Text>
              </Stack>
            </Group>
          </Card>
        )
      })}
    </SimpleGrid>
  )
}
