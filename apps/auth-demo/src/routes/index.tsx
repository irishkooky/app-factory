import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

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
      <Title order={1}>auth-demo</Title>
      <Text c="dimmed">
        Clerk と Convex を使った認証付きメモアプリのサンプルです。ログインすると、
        自分だけのメモを作成・削除できます。
      </Text>
      <SignInButton mode="modal">
        <Button size="md">Googleでログイン</Button>
      </SignInButton>
    </Stack>
  )
}

function AuthenticatedView() {
  const notes = useQuery(api.notes.list)
  const addNote = useMutation(api.notes.add)
  const removeNote = useMutation(api.notes.remove)

  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await addNote({ text })
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メモの追加に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (id: Id<'notes'>) => {
    setError(null)
    try {
      await removeNote({ id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メモの削除に失敗しました')
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={1}>マイメモ</Title>
        <UserButton />
      </Group>

      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <Group align="flex-end">
        <TextInput
          placeholder="メモを入力"
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          disabled={submitting}
          style={{ flex: 1 }}
        />
        <Button onClick={handleAdd} disabled={submitting || text.trim().length === 0} loading={submitting}>
          追加
        </Button>
      </Group>

      {notes === undefined ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : notes.length === 0 ? (
        <Text c="dimmed">メモがありません</Text>
      ) : (
        <Stack gap="sm">
          {notes.map((note) => (
            <Card key={note._id} withBorder radius="md" padding="md">
              <Group justify="space-between" wrap="nowrap">
                <Text style={{ wordBreak: 'break-word' }}>{note.text}</Text>
                <Button variant="subtle" color="red" size="xs" onClick={() => handleRemove(note._id)}>
                  削除
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
