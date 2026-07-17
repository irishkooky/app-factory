import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { Button, Container, Group, Stack, Stepper, Title } from '@mantine/core'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ReserveMenuStep } from '../components/reserve-menu-step'
import { ReserveStylistStep, type StylistChoice } from '../components/reserve-stylist-step'
import { ReserveDateTimeStep } from '../components/reserve-datetime-step'
import { ReserveConfirmStep } from '../components/reserve-confirm-step'
import { ReserveComplete } from '../components/reserve-complete'

type ReserveSearch = {
  menuId?: Id<'menus'>
  stylistId?: Id<'stylists'>
}

export const Route = createFileRoute('/reserve')({
  validateSearch: (search: Record<string, unknown>): ReserveSearch => ({
    menuId: typeof search.menuId === 'string' ? (search.menuId as Id<'menus'>) : undefined,
    stylistId:
      typeof search.stylistId === 'string' ? (search.stylistId as Id<'stylists'>) : undefined,
  }),
  component: ReserveComponent,
})

type CreateResult = {
  reservationId: string
  stylistId: Id<'stylists'>
  stylistName: string
  endMinutes: number
}

const FULLY_BOOKED_HINT = '埋まって'

function ReserveComponent() {
  const search = Route.useSearch()
  const { data: menus } = useSuspenseQuery(convexQuery(api.menus.listActive, {}))
  const { data: stylists } = useSuspenseQuery(convexQuery(api.stylists.listActive, {}))
  const createReservation = useMutation(api.reservations.create)

  const [active, setActive] = useState(0)
  const [menuId, setMenuId] = useState<Id<'menus'> | undefined>(() =>
    search.menuId && menus.some((m) => m._id === search.menuId) ? search.menuId : undefined,
  )
  const [stylistChoice, setStylistChoice] = useState<StylistChoice | undefined>(() =>
    search.stylistId && stylists.some((s) => s._id === search.stylistId)
      ? search.stylistId
      : undefined,
  )
  const [date, setDate] = useState<string | undefined>(undefined)
  const [startMinutes, setStartMinutes] = useState<number | undefined>(undefined)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<CreateResult | null>(null)

  const selectedMenu = menus.find((m) => m._id === menuId)
  const selectedStylist =
    stylistChoice && stylistChoice !== 'none'
      ? stylists.find((s) => s._id === stylistChoice)
      : undefined

  function handleSelectMenu(id: Id<'menus'>) {
    setMenuId(id)
    setDate(undefined)
    setStartMinutes(undefined)
    setActive(1)
  }

  function handleSelectStylist(choice: StylistChoice) {
    setStylistChoice(choice)
    setDate(undefined)
    setStartMinutes(undefined)
  }

  function handleSelectDate(d: string) {
    setDate(d)
    setStartMinutes(undefined)
    setErrorMessage(null)
  }

  function handleSelectStart(minutes: number) {
    setStartMinutes(minutes)
    setErrorMessage(null)
  }

  async function handleSubmit() {
    if (!menuId || !date || startMinutes === undefined) {
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const res = await createReservation({
        menuId,
        stylistId: stylistChoice && stylistChoice !== 'none' ? stylistChoice : undefined,
        date,
        startMinutes,
        customerName,
        customerPhone,
        note: note.trim().length > 0 ? note.trim() : undefined,
      })
      setResult(res)
    } catch (err) {
      if (err instanceof ConvexError) {
        const message =
          typeof err.data === 'string'
            ? err.data
            : '予約に失敗しました。時間をおいてお試しください。'
        setErrorMessage(message)
        if (message.includes(FULLY_BOOKED_HINT)) {
          setActive(2)
          setStartMinutes(undefined)
        }
      } else {
        setErrorMessage('予約に失敗しました。時間をおいてお試しください。')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (result && selectedMenu && date && startMinutes !== undefined) {
    return (
      <Container size="sm" py="xl">
        <ReserveComplete
          reservationId={result.reservationId}
          menuName={selectedMenu.name}
          price={selectedMenu.price}
          durationMinutes={selectedMenu.durationMinutes}
          stylistName={result.stylistName}
          date={date}
          startMinutes={startMinutes}
          endMinutes={result.endMinutes}
        />
      </Container>
    )
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Title order={1}>ご予約</Title>

        <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
          <Stepper.Step label="メニュー" description="メニュー選択">
            <Stack gap="md" mt="md">
              <ReserveMenuStep menus={menus} selectedMenuId={menuId} onSelect={handleSelectMenu} />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="スタイリスト" description="スタイリスト選択">
            <Stack gap="md" mt="md">
              <ReserveStylistStep
                stylists={stylists}
                selected={stylistChoice}
                onSelect={handleSelectStylist}
              />
              <Group justify="space-between">
                <Button variant="default" onClick={() => setActive(0)}>
                  戻る
                </Button>
                <Button disabled={!stylistChoice} onClick={() => setActive(2)}>
                  次へ
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="日時" description="日時選択">
            <Stack gap="md" mt="md">
              {menuId && stylistChoice && (
                <ReserveDateTimeStep
                  menuId={menuId}
                  stylistId={stylistChoice}
                  date={date}
                  onSelectDate={handleSelectDate}
                  startMinutes={startMinutes}
                  onSelectStart={handleSelectStart}
                  errorMessage={errorMessage}
                />
              )}
              <Group justify="space-between">
                <Button variant="default" onClick={() => setActive(1)}>
                  戻る
                </Button>
                <Button disabled={startMinutes === undefined} onClick={() => setActive(3)}>
                  次へ
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="確認" description="お客様情報・確認">
            <Stack gap="md" mt="md">
              {selectedMenu && date && startMinutes !== undefined && (
                <ReserveConfirmStep
                  menuName={selectedMenu.name}
                  price={selectedMenu.price}
                  durationMinutes={selectedMenu.durationMinutes}
                  stylistLabel={stylistChoice === 'none' ? '指名なし' : (selectedStylist?.name ?? '')}
                  date={date}
                  startMinutes={startMinutes}
                  customerName={customerName}
                  onChangeCustomerName={setCustomerName}
                  customerPhone={customerPhone}
                  onChangeCustomerPhone={setCustomerPhone}
                  note={note}
                  onChangeNote={setNote}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  errorMessage={errorMessage}
                />
              )}
              <Group justify="flex-start">
                <Button variant="default" onClick={() => setActive(2)} disabled={submitting}>
                  戻る
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>
        </Stepper>
      </Stack>
    </Container>
  )
}
