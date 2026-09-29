import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Alert, Anchor, Box, Button, Chip, Container, Group, Paper, Stack, Text, TextInput, Textarea, Title } from '@mantine/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'
import { isValidEmail, normalizeEmail } from '../lib/email'
import { detectPlatform } from '../lib/compose'
import { loadHistory, loadProfile } from '../lib/storage'

export const Route = createFileRoute('/contact')({
  head: () => ({ meta: [{ title: 'ご意見・ご要望｜名刺メール' }] }),
  component: ContactPage,
})

const KINDS = ['要望', '不具合', '導入・開発の相談', 'その他']
const MESSAGE_MAX = 2000

function ContactPage() {
  const [kind, setKind] = useState(KINDS[0])
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const profile = loadProfile()
    setName(profile.name)
    setCompany(profile.company)
  }, [])

  const emailInvalid = email.trim() !== '' && !isValidEmail(normalizeEmail(email))
  const canSend = message.trim().length >= 2 && !emailInvalid && !sending

  async function submit() {
    setSending(true)
    setError(null)
    try {
      const client = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL as string)
      await client.mutation(api.inquiries.submit, {
        kind,
        message,
        name,
        company,
        email: email.trim() ? normalizeEmail(email) : '',
        platform: detectPlatform(),
        userAgent: navigator.userAgent,
        scanCount: loadHistory().length,
        website,
      })
      setDone(true)
    } catch (err) {
      setError(`送信できませんでした。時間をおいてもう一度お試しください（${err instanceof Error ? err.message : String(err)}）`)
    } finally {
      setSending(false)
    }
  }

  return (
    <Container size="xs" py="lg" px="md">
      <Stack gap="lg">
        <Box>
          <Anchor component={Link} to="/" size="sm">
            ← 名刺メールに戻る
          </Anchor>
          <Title order={1} fz={24} mt="xs">
            ご意見・ご要望
          </Title>
          <Text c="dimmed" size="sm">
            使ってみた感想、ほしい機能、不具合、「自社向けに作ってほしい」などのご相談をお寄せください。
          </Text>
        </Box>

        {done ? (
          <Paper withBorder radius="lg" p="lg">
            <Stack gap="sm" align="flex-start">
              <Text fw={600} size="lg">
                ありがとうございました！
              </Text>
              <Text size="sm">
                いただいた内容はすべて目を通します。
                {email.trim() ? 'お返事が必要なものは入力いただいたメールアドレスにご連絡します。' : ''}
              </Text>
              <Button component={Link} to="/" variant="light">
                名刺メールに戻る
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper withBorder radius="lg" p="md">
            <Stack gap="md">
              {error && (
                <Alert color="red" withCloseButton onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              <Box>
                <Text size="sm" fw={500} mb={6}>
                  種類
                </Text>
                <Chip.Group multiple={false} value={kind} onChange={setKind}>
                  <Group gap={6}>
                    {KINDS.map((k) => (
                      <Chip key={k} value={k} size="sm">
                        {k}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </Box>
              <Textarea
                label="内容"
                withAsterisk
                placeholder="例: 名刺の裏面も一緒に読み取ってほしい"
                autosize
                minRows={4}
                maxLength={MESSAGE_MAX}
                value={message}
                onChange={(e) => setMessage(e.currentTarget.value)}
              />
              <Group grow>
                <TextInput label="お名前（任意）" value={name} onChange={(e) => setName(e.currentTarget.value)} />
                <TextInput label="会社（任意）" value={company} onChange={(e) => setCompany(e.currentTarget.value)} />
              </Group>
              <TextInput
                label="メールアドレス（任意）"
                description="お返事が必要な場合だけ"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                error={emailInvalid ? 'メールアドレスの形式を確認してください' : undefined}
              />
              {/* ボット避け。人間には見えない */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.currentTarget.value)}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />
              <Button size="md" radius="lg" onClick={submit} loading={sending} disabled={!canSend}>
                送信する
              </Button>
              <Text size="xs" c="dimmed">
                送信内容と端末の種類（iPhone / Android / PC）を記録します。名刺の画像や読み取った相手の情報は送りません。
              </Text>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}
