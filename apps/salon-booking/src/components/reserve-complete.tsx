import { Card, Stack, Table, Text, Title } from '@mantine/core'
import { formatMinutes, formatPrice } from '../../convex/lib'
import { ButtonLink } from './app-link'

export function ReserveComplete({
  reservationId,
  menuName,
  price,
  durationMinutes,
  stylistName,
  date,
  startMinutes,
  endMinutes,
}: {
  reservationId: string
  menuName: string
  price: number
  durationMinutes: number
  stylistName: string
  date: string
  startMinutes: number
  endMinutes: number
}) {
  const reservationNumber = reservationId.slice(-8).toUpperCase()

  return (
    <Stack gap="lg" align="center" ta="center">
      <Text fz={48} c="green.6">
        ✓
      </Text>
      <Title order={2}>ご予約ありがとうございます</Title>
      <Text c="dimmed">予約番号: {reservationNumber}</Text>

      <Card withBorder radius="md" padding="lg" w="100%" maw={480} ta="left">
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Th w={120}>メニュー</Table.Th>
              <Table.Td>{menuName}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>料金</Table.Th>
              <Table.Td>{formatPrice(price)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>所要時間</Table.Th>
              <Table.Td>約{durationMinutes}分</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>スタイリスト</Table.Th>
              <Table.Td>{stylistName}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>日時</Table.Th>
              <Table.Td>
                {date} {formatMinutes(startMinutes)}〜{formatMinutes(endMinutes)}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>

      <Text size="sm" c="dimmed">
        変更・キャンセルはお電話にて承ります。
      </Text>

      <ButtonLink to="/" variant="light">
        トップへ戻る
      </ButtonLink>
    </Stack>
  )
}
