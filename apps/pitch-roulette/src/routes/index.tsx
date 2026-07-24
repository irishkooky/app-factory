import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  List,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import { errorMessage } from '../lib/error'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <AuthLoading>
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        </AuthLoading>

        <Unauthenticated>
          <UnauthenticatedView />
        </Unauthenticated>

        <Authenticated>
          <AuthenticatedView />
        </Authenticated>
      </Stack>
    </Container>
  )
}

function UnauthenticatedView() {
  return (
    <Stack gap="lg" align="center" py="xl">
      <Title order={1} ta="center">
        🎰 ピッチルーレット
      </Title>
      <Text c="dimmed" ta="center">
        無茶振りお題で即興ピッチ。仲間から架空の出資を集めろ。
      </Text>
      <List spacing="xs" size="sm" center>
        <List.Item>① お題ルーレットを回す</List.Item>
        <List.Item>② 60秒の即興ピッチ</List.Item>
        <List.Item>③ みんなが出資額をジャッジ</List.Item>
      </List>
      <SignInButton mode="modal">
        <Button size="lg">Googleでログインして始める</Button>
      </SignInButton>
    </Stack>
  )
}

function AuthenticatedView() {
  const navigate = useNavigate()
  const createRoom = useMutation(api.game.createRoom)
  const joinRoom = useMutation(api.game.joinRoom)

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const handleCreate = async () => {
    setCreateError(null)
    setCreating(true)
    try {
      const code = await createRoom({})
      await navigate({ to: '/room/$code', params: { code } })
    } catch (err) {
      setCreateError(errorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    setJoinError(null)
    setJoining(true)
    try {
      const code = await joinRoom({ code: joinCode })
      await navigate({ to: '/room/$code', params: { code } })
    } catch (err) {
      setJoinError(errorMessage(err))
    } finally {
      setJoining(false)
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>🎰 ピッチルーレット</Title>
        <UserButton />
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={4}>ルームを作る</Title>
          <Text size="sm" c="dimmed">
            新しいルームを作って、コードを友達に共有しよう
          </Text>
          {createError && (
            <Alert color="red" title="エラー" onClose={() => setCreateError(null)} withCloseButton>
              {createError}
            </Alert>
          )}
          <Button size="lg" onClick={handleCreate} loading={creating} disabled={joining}>
            ルームを作成
          </Button>
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={4}>ルームに参加</Title>
          <TextInput
            placeholder="例: AB3K"
            maxLength={4}
            value={joinCode}
            onChange={(event) => setJoinCode(event.currentTarget.value.toUpperCase())}
            error={joinError}
            disabled={joining}
          />
          <Button
            size="lg"
            onClick={handleJoin}
            loading={joining}
            disabled={creating || joinCode.trim().length === 0}
          >
            参加する
          </Button>
        </Stack>
      </Card>
    </Stack>
  )
}
