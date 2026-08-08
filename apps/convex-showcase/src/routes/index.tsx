import { Suspense, startTransition, useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { ConvexError } from 'convex/values'
import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Menu,
  Modal,
  NavLink,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ALLOWED_EMOJIS } from '../lib/emojis'
import { AVATAR_EMOJIS, MAX_NAME_LENGTH } from '../lib/avatars'

const MEMBER_ID_STORAGE_KEY = 'convex-showcase:memberId'

// ConvexError はペイロードが err.data に入り、err.message では読めない
// （本番デプロイでは平メッセージの Error は "Server Error" に丸められる）
function errorMessageOf(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) {
    return typeof err.data === 'string' ? err.data : fallback
  }
  return err instanceof Error ? err.message : fallback
}

export const Route = createFileRoute('/')({
  component: HomeComponent,
  errorComponent: ErrorComponent,
})

function ErrorComponent({ reset }: ErrorComponentProps) {
  return (
    <Container size="sm" py="xl">
      <Alert color="red" title="エラー">
        <Stack gap="sm">
          <Text size="sm">
            バックエンドに接続できません。時間をおいて再読み込みしてください。
          </Text>
          <Button size="xs" variant="light" color="red" onClick={reset}>
            再試行
          </Button>
        </Stack>
      </Alert>
    </Container>
  )
}

type ChannelWithStats = FunctionReturnType<
  typeof api.channels.listWithStats
>[number]
type MemberDoc = FunctionReturnType<typeof api.members.list>[number]
type MessageWithMeta = FunctionReturnType<
  typeof api.messages.listByChannel
>[number]

function truncateBody(text: string, maxLength: number) {
  const chars = Array.from(text)
  if (chars.length <= maxLength) {
    return text
  }
  return `${chars.slice(0, maxLength).join('')}…`
}

function formatTime(creationTime: number) {
  return new Date(creationTime).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HomeComponent() {
  const channels = useSuspenseQuery(convexQuery(api.channels.listWithStats, {}))
  const members = useSuspenseQuery(convexQuery(api.members.list, {}))
  const channelList = channels.data

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [updateCount, setUpdateCount] = useState(0)

  const [storedId, setStoredId] = useState<string | null>(null)
  const [identityLoaded, setIdentityLoaded] = useState(false)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        setStoredId(window.localStorage.getItem(MEMBER_ID_STORAGE_KEY))
      }
    } catch {
      // localStorage が無効な環境（プライベートモード等）でも参加モーダルは開けるようにする
    } finally {
      setIdentityLoaded(true)
    }
  }, [])

  const me = members.data.find((m) => m._id === storedId && !m.isBot) ?? null
  // join 直後、members クエリが me を解決するまでのラグ。この間は参加ボタンを
  // loading のままにして二重送信（member の重複作成）を防ぐ
  const joinPending = identityLoaded && storedId !== null && me === null

  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const identityModalOpened = identityLoaded && (me === null || renameModalOpen)
  const identityModalMode: 'join' | 'rename' = me === null ? 'join' : 'rename'

  const join = useMutation(api.members.join)
  const rename = useMutation(api.members.rename)

  async function handleJoin(name: string, emoji: string) {
    const id = await join({ name, emoji })
    // DB上はもう member が作られているので、localStorage への保存が失敗しても
    // まずセッション内で使えるように storedId を先に確定させる
    setStoredId(id)
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MEMBER_ID_STORAGE_KEY, id)
      }
    } catch {
      // 保存できなくても今回のセッション中は参加済みとして扱う
    }
  }

  async function handleRename(name: string, emoji: string) {
    if (!me) {
      return
    }
    await rename({ memberId: me._id, name, emoji })
    setRenameModalOpen(false)
  }

  const activeChannelId = selectedChannelId ?? channelList[0]?._id ?? null

  function handleSelectChannel(channelId: string) {
    startTransition(() => {
      setSelectedChannelId(channelId)
    })
  }

  return (
    <Container size="lg" py="xl">
      <IdentityModal
        opened={identityModalOpened}
        mode={identityModalMode}
        me={me}
        pending={joinPending}
        onClose={() => setRenameModalOpen(false)}
        onSubmit={identityModalMode === 'join' ? handleJoin : handleRename}
      />
      {channelList.length === 0 ? (
        <Stack gap="lg">
          <Title order={1}>リアルタイム チームチャット</Title>
          <Card withBorder radius="md" padding="lg">
            <Text c="dimmed">
              データを準備中です。しばらくしてから再読み込みしてください。
            </Text>
          </Card>
        </Stack>
      ) : (
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={1}>リアルタイム チームチャット</Title>
            <Text c="dimmed">
              メッセージを送るとConvexのクエリ購読が自動で反応します。別タブを開いて、書き込みが即座に届く様子を確かめてみてください。
            </Text>
            <Group gap="sm">
              <Badge color="green" variant="dot">
                リアルタイム同期中 · 自動更新 {updateCount} 回受信
              </Badge>
              <Button
                variant="light"
                size="xs"
                onClick={() => window.open(window.location.pathname, '_blank')}
              >
                別タブで開いて同期を体感
              </Button>
            </Group>
          </Stack>

          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <ChannelSidebar
                channels={channelList}
                activeChannelId={activeChannelId}
                onSelect={handleSelectChannel}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              {activeChannelId && (
                <Suspense fallback={<Skeleton h={420} radius="md" />}>
                  <ChatPane
                    key={activeChannelId}
                    channelId={activeChannelId as Id<'channels'>}
                    me={me}
                    onRequestRename={() => setRenameModalOpen(true)}
                    onDataUpdated={setUpdateCount}
                  />
                </Suspense>
              )}
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <InfoPanel />
            </Grid.Col>
          </Grid>
        </Stack>
      )}
    </Container>
  )
}

function IdentityModal({
  opened,
  mode,
  me,
  pending,
  onClose,
  onSubmit,
}: {
  opened: boolean
  mode: 'join' | 'rename'
  me: MemberDoc | null
  pending: boolean
  onClose: () => void
  onSubmit: (name: string, emoji: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (opened) {
      setName(mode === 'rename' && me ? me.name : '')
      setEmoji(mode === 'rename' && me ? me.emoji : AVATAR_EMOJIS[0])
      setErrorMessage(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, mode, me?._id])

  const busy = isSubmitting || pending
  const isNameBlank = name.trim().length === 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isNameBlank || busy) {
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(name, emoji)
      setErrorMessage(null)
    } catch (err) {
      setErrorMessage(errorMessageOf(err, '保存に失敗しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeable = mode === 'rename'

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'join' ? 'チャットに参加' : '表示名を変更'}
      withCloseButton={closeable}
      closeOnClickOutside={closeable}
      closeOnEscape={closeable}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label="名前"
            placeholder="たろう"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Group gap={6}>
            {AVATAR_EMOJIS.map((candidate) => {
              const selected = emoji === candidate
              return (
                <Button
                  key={candidate}
                  type="button"
                  variant={selected ? 'filled' : 'default'}
                  aria-label={`アバター ${candidate}`}
                  aria-pressed={selected}
                  onClick={() => setEmoji(candidate)}
                >
                  {candidate}
                </Button>
              )
            })}
          </Group>
          {errorMessage && (
            <Text c="red" size="sm">
              {errorMessage}
            </Text>
          )}
          <Button type="submit" loading={busy} disabled={isNameBlank || busy}>
            {mode === 'join' ? '参加する' : '変更する'}
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}

function ChannelSidebar({
  channels,
  activeChannelId,
  onSelect,
}: {
  channels: ChannelWithStats[]
  activeChannelId: string | null
  onSelect: (channelId: string) => void
}) {
  return (
    <Card withBorder radius="md" padding="xs">
      <Stack gap={4}>
        {channels.map((channel) => {
          const description = channel.lastMessage
            ? `${channel.lastMessage.authorName}: ${truncateBody(channel.lastMessage.body, 20)}`
            : 'まだメッセージがありません'
          return (
            <NavLink
              key={channel._id}
              active={channel._id === activeChannelId}
              label={`${channel.emoji} ${channel.name}`}
              description={description}
              rightSection={
                <Badge size="sm" variant="light" color="gray">
                  {channel.messageCount}
                </Badge>
              }
              onClick={() => onSelect(channel._id)}
            />
          )
        })}
      </Stack>
    </Card>
  )
}

function ChatPane({
  channelId,
  me,
  onRequestRename,
  onDataUpdated,
}: {
  channelId: Id<'channels'>
  me: MemberDoc | null
  onRequestRename: () => void
  onDataUpdated: (count: number) => void
}) {
  const messages = useSuspenseQuery(convexQuery(api.messages.listByChannel, { channelId }))
  const send = useMutation(api.messages.send)
  const summonBot = useMutation(api.messages.summonBot)
  const toggleReaction = useMutation(api.reactions.toggle)

  const updates = useRef(0)
  useEffect(() => {
    updates.current += 1
    onDataUpdated(updates.current - 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.data])

  const viewportRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = viewportRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.data])

  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [botDisabled, setBotDisabled] = useState(false)
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current !== null) {
        clearTimeout(botTimeoutRef.current)
      }
    }
  }, [])

  const isBodyBlank = body.trim().length === 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isBodyBlank || isSubmitting || !me) {
      return
    }
    setIsSubmitting(true)
    try {
      await send({
        channelId,
        authorId: me._id,
        body,
      })
      setBody('')
      setErrorMessage(null)
    } catch (err) {
      setErrorMessage(errorMessageOf(err, '送信に失敗しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSummonBot() {
    setBotDisabled(true)
    try {
      await summonBot({ channelId })
      setErrorMessage(null)
    } catch (err) {
      setErrorMessage(errorMessageOf(err, 'Bot召喚に失敗しました'))
    } finally {
      botTimeoutRef.current = setTimeout(() => setBotDisabled(false), 3000)
    }
  }

  async function handleToggleReaction(messageId: Id<'messages'>, emoji: string) {
    if (!me) {
      return
    }
    try {
      await toggleReaction({
        messageId,
        memberId: me._id,
        emoji,
      })
    } catch (err) {
      setErrorMessage(errorMessageOf(err, 'リアクションに失敗しました'))
    }
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <ScrollArea h={420} viewportRef={viewportRef}>
          <Stack gap="md" p={4}>
            {messages.data.length === 0 ? (
              <Text c="dimmed" size="sm">
                まだメッセージがありません。最初のひとことをどうぞ。
              </Text>
            ) : (
              messages.data.map((message) => (
                <MessageRow
                  key={message._id}
                  message={message}
                  meId={me?._id ?? null}
                  onToggleReaction={handleToggleReaction}
                />
              ))
            )}
          </Stack>
        </ScrollArea>

        <form onSubmit={handleSubmit}>
          <Stack gap="xs">
            <Group gap="xs" wrap="nowrap">
              {me ? (
                <Group gap={4} wrap="nowrap">
                  <Badge size="lg" variant="light">
                    {me.emoji} {me.name}
                  </Badge>
                  <Button variant="subtle" size="compact-sm" type="button" onClick={onRequestRename}>
                    変更
                  </Button>
                </Group>
              ) : (
                <Badge size="lg" variant="light" color="gray">
                  未参加
                </Badge>
              )}
              <TextInput
                style={{ flex: 1 }}
                placeholder="メッセージを入力…"
                maxLength={500}
                value={body}
                onChange={(event) => setBody(event.currentTarget.value)}
                disabled={!me}
              />
              <Button type="submit" loading={isSubmitting} disabled={isBodyBlank || !me}>
                送信
              </Button>
            </Group>
            {errorMessage && (
              <Text c="red" size="sm">
                {errorMessage}
              </Text>
            )}
          </Stack>
        </form>

        <Button
          variant="gradient"
          gradient={{ from: 'indigo', to: 'grape' }}
          onClick={handleSummonBot}
          disabled={botDisabled || !me}
        >
          🤖 Convex Botを召喚（1.5秒後にサーバーから返信が届く）
        </Button>
        <Text size="xs" c="dimmed">
          クリック→mutation→サーバー側スケジューラが1.5秒後にBotの返信をinsert→このページはポーリング無しで受信します
        </Text>
      </Stack>
    </Card>
  )
}

function MessageRow({
  message,
  meId,
  onToggleReaction,
}: {
  message: MessageWithMeta
  meId: string | null
  onToggleReaction: (messageId: Id<'messages'>, emoji: string) => void
}) {
  return (
    <Group align="flex-start" wrap="nowrap" gap="sm">
      <Avatar radius="xl" color={message.author.isBot ? 'grape' : 'indigo'}>
        {message.author.emoji}
      </Avatar>
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6}>
          <Text fw={600} size="sm">
            {message.author.name}
          </Text>
          <Text c="dimmed" size="xs">
            {formatTime(message._creationTime)}
          </Text>
        </Group>
        <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {message.body}
        </Text>
        <Group gap={4}>
          {message.reactions.map((reaction) => (
            <Tooltip key={reaction.emoji} label={reaction.memberNames.join('、')}>
              <Button
                size="compact-xs"
                variant={
                  meId && reaction.memberIds.includes(meId) ? 'filled' : 'default'
                }
                onClick={() => onToggleReaction(message._id, reaction.emoji)}
              >
                {reaction.emoji} {reaction.count}
              </Button>
            </Tooltip>
          ))}
          <Menu shadow="md" width={140} position="top-start">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="sm" radius="xl">
                +
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {ALLOWED_EMOJIS.map((emoji) => (
                <Menu.Item key={emoji} onClick={() => onToggleReaction(message._id, emoji)}>
                  {emoji}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Stack>
    </Group>
  )
}

function InfoPanel() {
  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Title order={4}>いま何が起きているか</Title>
        <Accordion variant="separated">
          <Accordion.Item value="realtime">
            <Accordion.Control>⚡ リアルタイム性</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm">
                このチャットは useQuery を書いただけです。mutationが走ると関連するクエリだけがサーバー側で自動的に再実行され、結果がWebSocketでプッシュされます。ポーリングもキャッシュ無効化コードも0行です。
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="relational">
            <Accordion.Control>🔗 リレーショナル</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm">
                この画面は members / channels / messages / reactions の4テーブルを v.id() 参照でつなぎ、サーバー側のTypeScriptでJOINした結果です。JOIN結果そのものがリアクティブに配信されます。
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="transaction">
            <Accordion.Control>🔒 トランザクション</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm">
                リアクションのトグルは1つのmutation、つまりACIDトランザクションです。2人が同時に押しても状態が壊れません。
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        <Anchor component={Link} to="/why" size="sm">
          → 仕組みの詳しい解説を見る
        </Anchor>
      </Stack>
    </Card>
  )
}
