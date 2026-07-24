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
import { SignInButton } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'

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
    <Stack gap="lg">
      <Title order={1}>🍻 酔いどれピッチバトル</Title>
      <Text c="dimmed">
        飲み会で盛り上がるリアルタイム・パーティーゲーム。みんなでスマホからログインして、
        無茶振りお題でピッチバトルしよう。
      </Text>
      <Card withBorder radius="md" padding="lg">
        <List spacing="sm" size="sm">
          <List.Item>① お題ガチャで無茶振りスタートアップが決定</List.Item>
          <List.Item>② ピッチャーが60秒で熱く語る</List.Item>
          <List.Item>③ みんながVC気分で仮想投資！累計調達額でランキング</List.Item>
        </List>
      </Card>
      <SignInButton mode="modal">
        <Button size="md">Googleでログイン</Button>
      </SignInButton>
    </Stack>
  )
}

function AuthenticatedView() {
  const navigate = useNavigate()
  const createRoom = useMutation(api.game.createRoom)
  const joinRoom = useMutation(api.game.joinRoom)

  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    setError(null)
    setCreating(true)
    try {
      const { code } = await createRoom({})
      await navigate({ to: '/room/$code', params: { code } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルームの作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    setError(null)
    setJoining(true)
    try {
      const { code } = await joinRoom({ code: joinCode })
      await navigate({ to: '/room/$code', params: { code } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルームへの参加に失敗しました')
    } finally {
      setJoining(false)
    }
  }

  return (
    <Stack gap="lg">
      <Title order={1}>🍻 酔いどれピッチバトル</Title>

      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={3}>ルームを作る</Title>
          <Text size="sm" c="dimmed">
            ホストになって新しいルームを作成します。
          </Text>
          <Button onClick={handleCreate} loading={creating} disabled={creating}>
            🎉 ルームを作る
          </Button>
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={3}>合言葉で参加する</Title>
          <TextInput
            placeholder="4文字の合言葉"
            value={joinCode}
            maxLength={4}
            onChange={(event) => setJoinCode(event.currentTarget.value.toUpperCase())}
            disabled={joining}
          />
          <Button
            onClick={handleJoin}
            loading={joining}
            disabled={joining || joinCode.trim().length === 0}
          >
            🚪 参加する
          </Button>
        </Stack>
      </Card>
    </Stack>
  )
}
