import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { Alert, Button, Loader, ScrollArea, SimpleGrid, Stack, Text } from '@mantine/core'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { formatMinutes } from '../../convex/lib'
import {
  addDaysToLocalDateString,
  formatDateChipLabel,
  todayDateString,
  weekdayIndexOfDateString,
} from '../lib/client-date'
import type { StylistChoice } from './reserve-stylist-step'

const CLOSED_WEEKDAY = 2 // 火曜

const DATE_CHOICE_COUNT = 14

function TimeSlotPicker({
  date,
  menuId,
  stylistId,
  startMinutes,
  onSelectStart,
}: {
  date: string
  menuId: Id<'menus'>
  stylistId: StylistChoice
  startMinutes: number | undefined
  onSelectStart: (minutes: number) => void
}) {
  const { data, isLoading } = useQuery(
    convexQuery(api.reservations.availability, {
      date,
      menuId,
      stylistId: stylistId === 'none' ? undefined : stylistId,
    }),
  )

  if (isLoading || !data) {
    return <Loader size="sm" />
  }

  if (data.closed) {
    return (
      <Alert color="orange" variant="light">
        {data.reason ?? 'この日は予約できません。'}
      </Alert>
    )
  }

  if (data.slots.length === 0) {
    return (
      <Alert color="orange" variant="light">
        この条件で予約可能な時間がありません。
      </Alert>
    )
  }

  return (
    <SimpleGrid cols={{ base: 3, xs: 4, sm: 5, md: 6 }} spacing="xs">
      {data.slots.map((slot) => {
        const selected = slot.startMinutes === startMinutes
        return (
          <Button
            key={slot.startMinutes}
            size="sm"
            variant={selected ? 'filled' : slot.available ? 'light' : 'subtle'}
            color={slot.available ? 'orange' : 'gray'}
            disabled={!slot.available}
            onClick={() => onSelectStart(slot.startMinutes)}
          >
            {slot.available ? '○ ' : '× '}
            {formatMinutes(slot.startMinutes)}
          </Button>
        )
      })}
    </SimpleGrid>
  )
}

export function ReserveDateTimeStep({
  menuId,
  stylistId,
  date,
  onSelectDate,
  startMinutes,
  onSelectStart,
  errorMessage,
}: {
  menuId: Id<'menus'>
  stylistId: StylistChoice
  date: string | undefined
  onSelectDate: (date: string) => void
  startMinutes: number | undefined
  onSelectStart: (minutes: number) => void
  errorMessage: string | null
}) {
  const today = todayDateString()
  const dateChoices = Array.from({ length: DATE_CHOICE_COUNT }, (_, i) =>
    addDaysToLocalDateString(today, i),
  )

  return (
    <Stack gap="lg">
      {errorMessage && (
        <Alert color="red" variant="light">
          {errorMessage}
        </Alert>
      )}
      <Stack gap="xs">
        <Text fw={600}>日付を選択</Text>
        <ScrollArea offsetScrollbars>
          <Button.Group>
            {dateChoices.map((dateStr) => {
              const closed = weekdayIndexOfDateString(dateStr) === CLOSED_WEEKDAY
              const selected = dateStr === date
              return (
                <Button
                  key={dateStr}
                  variant={selected ? 'filled' : 'default'}
                  disabled={closed}
                  onClick={() => onSelectDate(dateStr)}
                >
                  <Stack gap={0} align="center">
                    <Text size="sm">{formatDateChipLabel(dateStr)}</Text>
                    {closed && (
                      <Text size="xs" c="dimmed">
                        定休
                      </Text>
                    )}
                  </Stack>
                </Button>
              )
            })}
          </Button.Group>
        </ScrollArea>
      </Stack>

      {date && (
        <Stack gap="xs">
          <Text fw={600}>時間を選択</Text>
          <TimeSlotPicker
            date={date}
            menuId={menuId}
            stylistId={stylistId}
            startMinutes={startMinutes}
            onSelectStart={onSelectStart}
          />
        </Stack>
      )}
    </Stack>
  )
}
