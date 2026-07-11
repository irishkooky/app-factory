import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import {
  Button,
  Card,
  Container,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function formatCreationTime(creationTime: number) {
  return new Date(creationTime).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
  })
}

function HomeComponent() {
  const { data: messages } = useSuspenseQuery(convexQuery(api.messages.list, {}))
  const addMessage = useMutation(api.messages.add)

  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isTextBlank = text.trim().length === 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isTextBlank || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      await addMessage({ name, text })
      setName('')
      setText('')
      setErrorMessage(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '投稿に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>ゲストブック</Title>
        <Text c="dimmed">ひとことどうぞ。投稿はみんなに公開されます。</Text>

        <Card withBorder radius="md" padding="lg">
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="名前"
                placeholder="名無しさん"
                maxLength={30}
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
              <Textarea
                label="メッセージ"
                placeholder="メッセージを入力してください"
                required
                maxLength={200}
                rows={3}
                value={text}
                onChange={(event) => setText(event.currentTarget.value)}
              />
              {errorMessage && <Text c="red">{errorMessage}</Text>}
              <Button type="submit" loading={isSubmitting} disabled={isTextBlank}>
                投稿する
              </Button>
            </Stack>
          </form>
        </Card>

        <Stack gap="sm">
          {messages.length === 0 ? (
            <Text c="dimmed">まだ投稿がありません。最初のひとことをどうぞ！</Text>
          ) : (
            messages.map((message: Doc<'messages'>) => (
              <Card key={message._id} withBorder radius="md" padding="lg">
                <Stack gap={4}>
                  <Text fw={600}>{message.name}</Text>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{message.text}</Text>
                  <Text size="xs" c="dimmed">
                    {formatCreationTime(message._creationTime)}
                  </Text>
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      </Stack>
    </Container>
  )
}
