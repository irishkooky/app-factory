import { Alert, Button, Card, Stack, Table, Text, Textarea, TextInput } from '@mantine/core'
import { formatMinutes, formatPrice } from '../../convex/lib'

export function ReserveConfirmStep({
  menuName,
  price,
  durationMinutes,
  stylistLabel,
  date,
  startMinutes,
  customerName,
  onChangeCustomerName,
  customerPhone,
  onChangeCustomerPhone,
  note,
  onChangeNote,
  onSubmit,
  submitting,
  errorMessage,
}: {
  menuName: string
  price: number
  durationMinutes: number
  stylistLabel: string
  date: string
  startMinutes: number
  customerName: string
  onChangeCustomerName: (value: string) => void
  customerPhone: string
  onChangeCustomerPhone: (value: string) => void
  note: string
  onChangeNote: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  errorMessage: string | null
}) {
  const endMinutes = startMinutes + durationMinutes
  const nameTrimmed = customerName.trim()
  const phoneDigits = customerPhone.replace(/\D/g, '')
  const canSubmit =
    nameTrimmed.length >= 1 &&
    nameTrimmed.length <= 30 &&
    phoneDigits.length >= 10 &&
    phoneDigits.length <= 11 &&
    note.length <= 200

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <TextInput
          label="お名前"
          placeholder="山田 太郎"
          required
          maxLength={30}
          value={customerName}
          onChange={(e) => onChangeCustomerName(e.currentTarget.value)}
        />
        <TextInput
          label="電話番号"
          placeholder="090-1234-5678"
          required
          value={customerPhone}
          onChange={(e) => onChangeCustomerPhone(e.currentTarget.value)}
        />
        <Textarea
          label="ご要望（任意）"
          placeholder="ご要望があればご記入ください"
          maxLength={200}
          rows={3}
          value={note}
          onChange={(e) => onChangeNote(e.currentTarget.value)}
        />
      </Stack>

      <Card withBorder radius="md" padding="lg">
        <Text fw={700} mb="xs">
          ご予約内容
        </Text>
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
              <Table.Td>{stylistLabel}</Table.Td>
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

      {errorMessage && (
        <Alert color="red" variant="light">
          {errorMessage}
        </Alert>
      )}

      <Button size="lg" loading={submitting} disabled={!canSubmit} onClick={onSubmit}>
        この内容で予約する
      </Button>
    </Stack>
  )
}
