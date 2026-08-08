import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Alert, Button, Card, Container, Stack, Text, TextInput, Title } from '@mantine/core'
import { api } from '../../convex/_generated/api'
import { getDeviceId } from '../lib/deviceId'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const navigate = useNavigate()
  const createRoom = useMutation(api.rooms.createRoom)
  const joinRoom = useMutation(api.rooms.joinRoom)

  // deviceIdはSSRでは取得できないため、クライアント側でのみ useEffect で取得する
  const [deviceId, setDeviceId] = useState<string | null>(null)
  useEffect(() => {
    setDeviceId(getDeviceId())
  }, [])

  const [joinCode, setJoinCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleCreate() {
    if (!deviceId || isCreating) return
    setIsCreating(true)
    setErrorMessage(null)
    try {
      const { code } = await createRoom({ deviceId })
      await navigate({ to: '/room/$code', params: { code } })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '部屋の作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!deviceId || isJoining) return

    const code = joinCode.trim()
    if (!/^\d{4}$/.test(code)) {
      setErrorMessage('ルームコードは4桁の数字で入力してください')
      return
    }

    setIsJoining(true)
    setErrorMessage(null)
    try {
      await joinRoom({ code, deviceId })
      await navigate({ to: '/room/$code', params: { code } })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '入室に失敗しました')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>チューリング人狼</Title>
        <Text c="dimmed">
          参加者の中にAIが1人だけ紛れ込みます。全員でお題に答え、そろったら一斉公開。
          最後に「どの席がAIか」を投票して当てるゲームです。あなたの席（仮名）を知っているのはあなただけ。
          AIの正体を見破れるか、それとも人間だと騙されるか？
        </Text>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Title order={3}>部屋を作る</Title>
            <Text size="sm" c="dimmed">
              新しい部屋を作って、友達を招待しましょう。
            </Text>
            <Button onClick={handleCreate} loading={isCreating} disabled={!deviceId}>
              部屋を作る
            </Button>
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <form onSubmit={handleJoin}>
            <Stack gap="sm">
              <Title order={3}>部屋に入る</Title>
              <TextInput
                label="ルームコード（4桁）"
                placeholder="1234"
                inputMode="numeric"
                maxLength={4}
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(event.currentTarget.value.replace(/\D/g, '').slice(0, 4))
                }
              />
              <Button type="submit" loading={isJoining} disabled={!deviceId}>
                入室
              </Button>
            </Stack>
          </form>
        </Card>

        {errorMessage && (
          <Alert color="red" title="エラー">
            {errorMessage}
          </Alert>
        )}
      </Stack>
    </Container>
  )
}
