import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  CopyButton,
  FileButton,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { scanCard } from '../server/scan'
import { writeDraft } from '../server/draft'
import { isValidEmail, normalizeEmail } from '../lib/email'
import { prepareImage } from '../lib/image'
import { buildTemplateDraft, signatureBlock, withSignature } from '../lib/template'
import { detectPlatform, gmailAppUrl, gmailWebUrl, mailtoUrl, type Platform } from '../lib/compose'
import { DEFAULT_PROFILE, loadHistory, loadProfile, saveHistory, saveProfile } from '../lib/storage'
import { EMPTY_CARD, type CardInfo, type HistoryEntry, type MailDraft, type SenderProfile } from '../lib/types'

export const Route = createFileRoute('/')({
  component: HomePage,
})

type Step = 'idle' | 'scanning' | 'review'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function HomePage() {
  const [step, setStep] = useState<Step>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [card, setCard] = useState<CardInfo>(EMPTY_CARD)
  const [to, setTo] = useState('')
  const [memo, setMemo] = useState('')
  const [draft, setDraft] = useState<MailDraft>({ subject: '', body: '' })
  const [error, setError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)

  const [profile, setProfile] = useState<SenderProfile>(DEFAULT_PROFILE)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [hydrated, setHydrated] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setProfile(loadProfile())
    setHistory(loadHistory())
    setPlatform(detectPlatform())
    setHydrated(true)
  }, [])

  const profileMissing = hydrated && !profile.name.trim()
  const toValid = isValidEmail(to)

  function persist(patch: Partial<HistoryEntry> = {}) {
    if (!entryId) return
    setHistory((prev) => {
      const existing = prev.find((e) => e.id === entryId)
      const entry: HistoryEntry = {
        id: entryId,
        createdAt: existing?.createdAt ?? Date.now(),
        card,
        to,
        draft,
        opened: existing?.opened ?? false,
        ...patch,
      }
      const next = [entry, ...prev.filter((e) => e.id !== entryId)]
      saveHistory(next)
      return next
    })
  }

  async function handleFile(file: File | null) {
    if (!file) return
    setError(null)
    setStep('scanning')
    setMemo('')
    try {
      const img = await prepareImage(file)
      setPreview(img.previewUrl)
      const result = await scanCard({ data: { imageBase64: img.base64, mimeType: img.mimeType } })
      const firstEmail = result.emails[0] ?? ''
      const nextDraft = buildTemplateDraft(result, profile, '')
      const id = newId()
      setCard(result)
      setTo(firstEmail)
      setDraft(nextDraft)
      setEntryId(id)
      setStep('review')
      if (!firstEmail) {
        setError('メールアドレスが見つかりませんでした。宛先を手で入力してください。')
      }
      setHistory((prev) => {
        const next = [
          { id, createdAt: Date.now(), card: result, to: firstEmail, draft: nextDraft, opened: false },
          ...prev,
        ]
        saveHistory(next)
        return next
      })
    } catch (err) {
      setError(`読み取りに失敗しました: ${errorMessage(err)}`)
      setStep('idle')
    }
  }

  async function trySample() {
    try {
      const res = await fetch('/sample-card.jpg')
      const blob = await res.blob()
      await handleFile(new File([blob], 'sample-card.jpg', { type: 'image/jpeg' }))
    } catch (err) {
      setError(`サンプルを読み込めませんでした: ${errorMessage(err)}`)
    }
  }

  async function generateWithAi() {
    setAiLoading(true)
    setError(null)
    try {
      const result = await writeDraft({ data: { card, sender: profile, memo } })
      setDraft(result)
      persist({ draft: result })
    } catch (err) {
      setError(`AI での作成に失敗しました。テンプレートの文面はそのまま使えます（${errorMessage(err)}）`)
    } finally {
      setAiLoading(false)
    }
  }

  function applyTemplate() {
    const next = buildTemplateDraft(card, profile, memo)
    setDraft(next)
    persist({ draft: next })
  }

  function markOpened() {
    persist({ opened: true })
  }

  function reset() {
    persist()
    setStep('idle')
    setPreview(null)
    setCard(EMPTY_CARD)
    setTo('')
    setMemo('')
    setDraft({ subject: '', body: '' })
    setEntryId(null)
    setError(null)
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function restore(entry: HistoryEntry) {
    setEntryId(entry.id)
    setCard(entry.card)
    setTo(entry.to)
    // 署名を本文に含めていた頃の履歴は、署名を外してから戻す（送信時に付け直す）
    const legacySignature = signatureBlock(profile)
    const body = legacySignature && entry.draft.body.trimEnd().endsWith(legacySignature)
      ? entry.draft.body.trimEnd().slice(0, -legacySignature.length).trimEnd()
      : entry.draft.body
    setDraft({ ...entry.draft, body })
    setMemo('')
    setPreview(null)
    setError(null)
    setStep('review')
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function removeEntry(id: string) {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id)
      saveHistory(next)
      return next
    })
  }

  function toggleSignature(includeSignature: boolean) {
    const next = { ...profile, includeSignature }
    setProfile(next)
    saveProfile(next)
  }

  function saveSettings(next: SenderProfile) {
    setProfile(next)
    saveProfile(next)
    setSettingsOpen(false)
    if (step === 'review' && !memo.trim()) {
      setDraft(buildTemplateDraft(card, next, ''))
    }
  }

  const outgoing = withSignature(draft, profile)
  const signaturePreview = signatureBlock(profile)
  const primaryHref =
    platform === 'ios' ? gmailAppUrl(to, outgoing) : platform === 'android' ? mailtoUrl(to, outgoing) : gmailWebUrl(to, outgoing)
  const primaryHint =
    platform === 'ios'
      ? 'Gmail アプリの作成画面が開きます。送らずに左上の × で閉じると「下書きを保存」できます。'
      : platform === 'android'
        ? 'Gmail（既定のメールアプリ）の作成画面が開きます。戻ると下書きに保存されます。'
        : 'Gmail の作成画面が新しいタブで開き、そのまま下書きに自動保存されます。'

  return (
    <Container size="xs" py="lg" px="md" ref={topRef}>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box>
            <Title order={1} fz={26}>
              名刺メール
            </Title>
            <Text c="dimmed" size="sm">
              名刺を撮るだけで、お礼メールの下書きまで。
            </Text>
          </Box>
          <Button variant="default" size="xs" style={{ flex: 'none' }} onClick={() => setSettingsOpen(true)}>
            自分の情報
          </Button>
        </Group>

        {profileMissing && (
          <Alert color="yellow" title="まず自分の名前を設定しましょう">
            <Stack gap="xs">
              <Text size="sm">名乗りと署名がメールに自動で入ります（署名はオフにもできます）。一度設定すればこの端末に保存されます。</Text>
              <Button size="xs" w="fit-content" onClick={() => setSettingsOpen(true)}>
                設定する
              </Button>
            </Stack>
          </Alert>
        )}

        {error && (
          <Alert color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {step === 'idle' && (
          <Paper withBorder radius="lg" p="lg">
            <Stack gap="sm">
              <Text fw={600}>名刺を読み取る</Text>
              <FileButton onChange={handleFile} accept="image/*" capture="environment">
                {(props) => (
                  <Button {...props} size="xl" radius="lg" fullWidth>
                    📷 名刺を撮影する
                  </Button>
                )}
              </FileButton>
              <FileButton onChange={handleFile} accept="image/*">
                {(props) => (
                  <Button {...props} variant="light" fullWidth>
                    写真から選ぶ
                  </Button>
                )}
              </FileButton>
              <Anchor component="button" type="button" size="sm" c="dimmed" onClick={trySample}>
                名刺が手元にない？ サンプル名刺で試す
              </Anchor>
            </Stack>
          </Paper>
        )}

        {step === 'scanning' && (
          <Paper withBorder radius="lg" p="lg">
            <Stack align="center" gap="md">
              {preview && <Image src={preview} radius="md" mah={220} fit="contain" alt="撮影した名刺" />}
              <Group gap="xs">
                <Loader size="sm" />
                <Text>AI が名刺を読んでいます…</Text>
              </Group>
            </Stack>
          </Paper>
        )}

        {step === 'review' && (
          <Stack gap="md">
            <Paper withBorder radius="lg" p="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={600}>1. 読み取り結果</Text>
                  <Button variant="subtle" size="xs" onClick={reset}>
                    撮り直す
                  </Button>
                </Group>
                {preview && <Image src={preview} radius="md" mah={160} fit="contain" alt="撮影した名刺" />}
                <SimpleGrid cols={2} spacing="xs">
                  <TextInput
                    label="お名前"
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.currentTarget.value })}
                  />
                  <TextInput
                    label="会社"
                    value={card.company}
                    onChange={(e) => setCard({ ...card, company: e.currentTarget.value })}
                  />
                </SimpleGrid>
                {(card.title || card.department) && (
                  <Text size="xs" c="dimmed">
                    {[card.department, card.title].filter(Boolean).join(' / ')}
                  </Text>
                )}
                {card.emails.length > 1 && (
                  <SegmentedControl
                    orientation="vertical"
                    fullWidth
                    value={card.emails.includes(to) ? to : ''}
                    onChange={setTo}
                    data={card.emails}
                  />
                )}
                <TextInput
                  label="宛先メールアドレス"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={to}
                  onChange={(e) => setTo(e.currentTarget.value)}
                  onBlur={() => setTo(normalizeEmail(to))}
                  error={to && !toValid ? 'メールアドレスの形式を確認してください' : undefined}
                  styles={{ input: { fontWeight: 600 } }}
                />
                {card.phones.length > 0 && (
                  <Text size="xs" c="dimmed">
                    TEL: {card.phones.join(' / ')}
                  </Text>
                )}
              </Stack>
            </Paper>

            <Paper withBorder radius="lg" p="md">
              <Stack gap="sm">
                <Text fw={600}>2. ひとことメモ（任意）</Text>
                <Textarea
                  placeholder="例: 採用の悩みで盛り上がった／来月ランチに行く約束"
                  autosize
                  minRows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.currentTarget.value)}
                />
                <Group grow>
                  <Button onClick={generateWithAi} loading={aiLoading} variant="gradient" gradient={{ from: 'indigo', to: 'grape' }}>
                    ✨ AI で文面を作る
                  </Button>
                  <Button variant="default" onClick={applyTemplate} disabled={aiLoading}>
                    定型文にする
                  </Button>
                </Group>
              </Stack>
            </Paper>

            <Paper withBorder radius="lg" p="md">
              <Stack gap="sm">
                <Text fw={600}>3. 下書き</Text>
                <TextInput
                  label="件名"
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.currentTarget.value })}
                />
                <Textarea
                  label="本文"
                  autosize
                  minRows={8}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.currentTarget.value })}
                />
                <Switch
                  label="署名を付ける"
                  description="Gmail の自動署名を使っているならオフに"
                  checked={profile.includeSignature}
                  onChange={(e) => toggleSignature(e.currentTarget.checked)}
                />
                {profile.includeSignature && (
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                    {signaturePreview || '署名が空です。「自分の情報」で名前と会社を入れると付きます。'}
                  </Text>
                )}
                <Button
                  component="a"
                  href={toValid ? primaryHref : undefined}
                  target={platform === 'desktop' ? '_blank' : undefined}
                  rel="noreferrer"
                  size="lg"
                  radius="lg"
                  color="red"
                  disabled={!toValid}
                  onClick={markOpened}
                >
                  Gmail で下書きを開く
                </Button>
                <Text size="xs" c="dimmed">
                  {primaryHint}
                </Text>
                <Group grow>
                  <Button
                    component="a"
                    href={toValid ? mailtoUrl(to, outgoing) : undefined}
                    variant="default"
                    disabled={!toValid}
                    onClick={markOpened}
                  >
                    他のメールアプリ
                  </Button>
                  <CopyButton value={`${to}\n件名: ${outgoing.subject}\n\n${outgoing.body}`} timeout={1500}>
                    {({ copied, copy }) => (
                      <Button variant="default" color={copied ? 'teal' : undefined} onClick={copy}>
                        {copied ? 'コピーしました' : '全文コピー'}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
              </Stack>
            </Paper>

            <Button variant="light" size="md" onClick={reset}>
              次の名刺へ →
            </Button>
          </Stack>
        )}

        {history.length > 0 && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600}>今日交換した名刺（{history.length}）</Text>
              <CopyButton value={historyCsv(history)}>
                {({ copied, copy }) => (
                  <Button variant="subtle" size="compact-xs" onClick={copy}>
                    {copied ? 'コピーしました' : 'CSV でコピー'}
                  </Button>
                )}
              </CopyButton>
            </Group>
            {history.map((entry) => (
              <Card key={entry.id} withBorder radius="md" padding="sm">
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Box style={{ minWidth: 0, cursor: 'pointer', flex: 1 }} onClick={() => restore(entry)}>
                    <Group gap={6} wrap="nowrap">
                      <Text fw={600} truncate>
                        {entry.card.name || '（名前なし）'}
                      </Text>
                      {entry.opened && (
                        <Badge size="xs" color="teal" variant="light" tt="none">
                          下書き済
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                      {[entry.card.company, entry.to].filter(Boolean).join(' ・ ')}
                    </Text>
                  </Box>
                  <Button variant="subtle" color="gray" size="compact-xs" onClick={() => removeEntry(entry.id)}>
                    削除
                  </Button>
                </Group>
              </Card>
            ))}
          </Stack>
        )}

        <Paper withBorder radius="lg" p="md" bg="var(--mantine-color-indigo-light)">
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Box>
              <Text fw={600} size="sm">
                ご意見・ご要望をお聞かせください
              </Text>
              <Text size="xs" c="dimmed">
                「こんな機能がほしい」「うちの会社でも使いたい」など、なんでもどうぞ。
              </Text>
            </Box>
            <Button component={Link} to="/contact" size="xs" style={{ flex: 'none' }}>
              送る
            </Button>
          </Group>
        </Paper>

        <Center>
          <Text size="xs" c="dimmed" ta="center">
            写真は読み取りのために Google Gemini API に送られます。保存はしません。
            <br />
            履歴と設定はこの端末のブラウザにだけ保存されます。
          </Text>
        </Center>
      </Stack>

      <SettingsModal opened={settingsOpen} profile={profile} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />
    </Container>
  )
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function historyCsv(history: HistoryEntry[]): string {
  const header = ['名前', '会社', '部署', '役職', 'メール', '電話', '交換日時']
  const rows = history.map((e) =>
    [
      e.card.name,
      e.card.company,
      e.card.department,
      e.card.title,
      e.to,
      e.card.phones.join(' / '),
      new Date(e.createdAt).toLocaleString('ja-JP'),
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.map(csvCell).join(','), ...rows].join('\n')
}

function SettingsModal({
  opened,
  profile,
  onClose,
  onSave,
}: {
  opened: boolean
  profile: SenderProfile
  onClose: () => void
  onSave: (profile: SenderProfile) => void
}) {
  const [form, setForm] = useState(profile)

  useEffect(() => {
    if (opened) setForm(profile)
  }, [opened, profile])

  return (
    <Modal opened={opened} onClose={onClose} title="自分の情報" centered>
      <Stack gap="sm">
        <TextInput
          label="お名前"
          placeholder="山田 花子"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
        />
        <TextInput
          label="会社・屋号"
          placeholder="株式会社〇〇"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.currentTarget.value })}
        />
        <TextInput
          label="今日のイベント名"
          description="件名と本文の「本日の〇〇で」に入ります"
          value={form.eventName}
          onChange={(e) => setForm({ ...form, eventName: e.currentTarget.value })}
        />
        <Textarea
          label="署名（任意）"
          description="空欄なら会社名と名前から自動で作ります"
          placeholder={'――――――――――――\n株式会社〇〇\n山田 花子\nTEL 090-xxxx-xxxx'}
          autosize
          minRows={3}
          value={form.signature}
          onChange={(e) => setForm({ ...form, signature: e.currentTarget.value })}
          disabled={!form.includeSignature}
        />
        <Switch
          label="署名を付ける"
          description="Gmail の自動署名を使っているならオフに"
          checked={form.includeSignature}
          onChange={(e) => setForm({ ...form, includeSignature: e.currentTarget.checked })}
        />
        <Button onClick={() => onSave(form)}>保存</Button>
      </Stack>
    </Modal>
  )
}
