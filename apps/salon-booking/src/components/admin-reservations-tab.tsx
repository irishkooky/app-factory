import { useState } from 'react'
import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { DatePickerInput } from '@mantine/dates'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { formatMinutes, formatPrice } from '../../convex/lib'
import { addDaysToLocalDateString, todayDateString } from '../lib/client-date'

type ReservationStatus = Doc<'reservations'>['status']

const STATUS_LABEL: Record<ReservationStatus, string> = {
  confirmed: '予約確定',
  done: '来店済み',
  cancelled: 'キャンセル',
}

const STATUS_COLOR: Record<ReservationStatus, string> = {
  confirmed: 'orange',
  done: 'green',
  cancelled: 'gray',
}

function StatusActions({
  id,
  status,
  onChangeStatus,
  busy,
}: {
  id: Id<'reservations'>
  status: ReservationStatus
  onChangeStatus: (id: Id<'reservations'>, status: ReservationStatus) => void
  busy: boolean
}) {
  if (status === 'confirmed') {
    return (
      <Group gap="xs" wrap="nowrap">
        <Button size="xs" variant="light" color="green" disabled={busy} onClick={() => onChangeStatus(id, 'done')}>
          来店済みにする
        </Button>
        <Button size="xs" variant="light" color="red" disabled={busy} onClick={() => onChangeStatus(id, 'cancelled')}>
          キャンセル
        </Button>
      </Group>
    )
  }
  return (
    <Button size="xs" variant="light" disabled={busy} onClick={() => onChangeStatus(id, 'confirmed')}>
      予約確定に戻す
    </Button>
  )
}

export function AdminReservationsTab() {
  const [selectedDate, setSelectedDate] = useState(todayDateString())
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<Id<'reservations'> | null>(null)

  const { data: dayReservations } = useQuery({
    ...convexQuery(api.reservations.listByDate, { date: selectedDate }),
    placeholderData: keepPreviousData,
  })
  const { data: upcoming } = useSuspenseQuery(convexQuery(api.reservations.listUpcoming, {}))
  const updateStatus = useMutation(api.reservations.updateStatus)

  async function handleChangeStatus(id: Id<'reservations'>, status: ReservationStatus) {
    setActionError(null)
    setBusyId(id)
    try {
      await updateStatus({ id, status })
    } catch (err) {
      setActionError(
        err instanceof ConvexError && typeof err.data === 'string'
          ? err.data
          : '更新に失敗しました。時間をおいてお試しください。',
      )
    } finally {
      setBusyId(null)
    }
  }

  const countable = (dayReservations ?? []).filter(
    (r) => r.status === 'confirmed' || r.status === 'done',
  )
  const expectedSales = countable.reduce((sum, r) => sum + r.menuPrice, 0)

  return (
    <Stack gap="xl">
      <Group>
        <ActionIcon
          variant="default"
          size="lg"
          onClick={() => setSelectedDate((d) => addDaysToLocalDateString(d, -1))}
          aria-label="前日"
        >
          ←
        </ActionIcon>
        <DatePickerInput
          value={selectedDate}
          onChange={(value) => {
            if (value) {
              setSelectedDate(value)
            }
          }}
          valueFormat="YYYY-MM-DD"
          w={180}
        />
        <ActionIcon
          variant="default"
          size="lg"
          onClick={() => setSelectedDate((d) => addDaysToLocalDateString(d, 1))}
          aria-label="翌日"
        >
          →
        </ActionIcon>
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Group gap="xl">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              予約件数（予約確定＋来店済み）
            </Text>
            <Text fw={700} fz="xl">
              {countable.length}件
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              売上見込み
            </Text>
            <Text fw={700} fz="xl" c="red.7">
              {formatPrice(expectedSales)}
            </Text>
          </Stack>
        </Group>
      </Card>

      {actionError && (
        <Alert color="red" variant="light" onClose={() => setActionError(null)} withCloseButton>
          {actionError}
        </Alert>
      )}

      <Stack gap="sm">
        <Title order={4}>{selectedDate} の予約</Title>
        {dayReservations === undefined ? (
          <Loader size="sm" />
        ) : dayReservations.length === 0 ? (
          <Text c="dimmed">この日の予約はありません。</Text>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>時間</Table.Th>
                  <Table.Th>顧客名</Table.Th>
                  <Table.Th>電話</Table.Th>
                  <Table.Th>メニュー</Table.Th>
                  <Table.Th>スタイリスト</Table.Th>
                  <Table.Th>ステータス</Table.Th>
                  <Table.Th>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {dayReservations.map((r) => (
                  <Table.Tr key={r._id}>
                    <Table.Td>
                      {formatMinutes(r.startMinutes)}〜{formatMinutes(r.endMinutes)}
                    </Table.Td>
                    <Table.Td>{r.customerName}</Table.Td>
                    <Table.Td>{r.customerPhone}</Table.Td>
                    <Table.Td>{r.menuName}</Table.Td>
                    <Table.Td>{r.stylistName}</Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <StatusActions
                        id={r._id}
                        status={r.status}
                        onChangeStatus={handleChangeStatus}
                        busy={busyId === r._id}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>

      <Stack gap="sm">
        <Title order={4}>今後の予約一覧</Title>
        {upcoming.length === 0 ? (
          <Text c="dimmed">今後の予約はありません。</Text>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>日付</Table.Th>
                  <Table.Th>時間</Table.Th>
                  <Table.Th>顧客名</Table.Th>
                  <Table.Th>メニュー</Table.Th>
                  <Table.Th>スタイリスト</Table.Th>
                  <Table.Th>ステータス</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {upcoming.map((r) => (
                  <Table.Tr key={r._id} style={{ opacity: r.status === 'cancelled' ? 0.5 : 1 }}>
                    <Table.Td>{r.date}</Table.Td>
                    <Table.Td>
                      {formatMinutes(r.startMinutes)}〜{formatMinutes(r.endMinutes)}
                    </Table.Td>
                    <Table.Td>{r.customerName}</Table.Td>
                    <Table.Td>{r.menuName}</Table.Td>
                    <Table.Td>{r.stylistName}</Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Stack>
  )
}
