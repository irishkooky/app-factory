import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  CopyButton,
  Divider,
  Group,
  Loader,
  RingProgress,
  Slider,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
import { SignInButton, UserButton, useUser } from '@clerk/clerk-react'
import type { FunctionReturnType } from 'convex/server'
import { ConvexError } from 'convex/values'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { errorMessage } from '../lib/error'

const ROUND_DURATION_MS = 60_000

export const Route = createFileRoute('/room/$code')({
  component: RoomComponent,
})

function RoomComponent() {
  const { code } = Route.useParams()

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <AuthLoading>
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        </AuthLoading>

        <Unauthenticated>
          <Stack align="center" gap="md" py="xl">
            <Title order={3} ta="center">
              このルームに参加するにはログインしてください
            </Title>
            <SignInButton mode="modal">
              <Button size="lg">Googleでログイン</Button>
            </SignInButton>
          </Stack>
        </Unauthenticated>

        <Authenticated>
          <RoomAuthenticated code={code} />
        </Authenticated>
      </Stack>
    </Container>
  )
}

function RoomAuthenticated({ code }: { code: string }) {
  const navigate = useNavigate()
  const room = useQuery(api.game.getRoom, { code })
  const joinRoom = useMutation(api.game.joinRoom)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  if (room === undefined) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    )
  }

  if (room === null) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Alert color="red" title="ルームが見つかりません" w="100%">
          コード「{code}」のルームは見つかりませんでした。
        </Alert>
        <Button size="lg" onClick={() => void navigate({ to: '/' })}>
          トップへ戻る
        </Button>
      </Stack>
    )
  }

  const handleJoin = async () => {
    setJoinError(null)
    setJoining(true)
    try {
      await joinRoom({ code })
    } catch (err) {
      setJoinError(errorMessage(err))
    } finally {
      setJoining(false)
    }
  }

  if (!room.isMember) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Title order={3} ta="center">
          ルーム {room.room.code} に招待されています
        </Title>
        {joinError && (
          <Alert color="red" title="エラー" w="100%">
            {joinError}
          </Alert>
        )}
        <Button size="lg" onClick={handleJoin} loading={joining}>
          参加する
        </Button>
      </Stack>
    )
  }

  return <RoomBoard data={room} />
}

type RoomData = NonNullable<FunctionReturnType<typeof api.game.getRoom>>

function RoomBoard({ data }: { data: RoomData }) {
  const { room, players } = data
  const { user } = useUser()
  const startRound = useMutation(api.game.startRound)
  const currentRound = useQuery(api.game.currentRound, { roomId: room._id })
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const handleStart = async () => {
    setStartError(null)
    setStarting(true)
    try {
      await startRound({ roomId: room._id })
    } catch (err) {
      // 他の誰かが先にルーレットを回しただけなので、この競合エラーは静かに無視する
      const isRoundAlreadyActive =
        err instanceof ConvexError && err.data === '進行中のピッチがあります'
      if (!isRoundAlreadyActive) {
        setStartError(errorMessage(err))
      }
    } finally {
      setStarting(false)
    }
  }

  return (
    <Stack gap="lg">
      <RoomHeader room={room} players={players} />

      {currentRound === undefined ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : currentRound === null ? (
        <Card withBorder radius="md" padding="xl">
          <Stack align="center" gap="md">
            {startError && (
              <Alert
                color="red"
                title="エラー"
                w="100%"
                onClose={() => setStartError(null)}
                withCloseButton
              >
                {startError}
              </Alert>
            )}
            <Button size="lg" onClick={handleStart} loading={starting}>
              🎰 ルーレットを回してピッチする！
            </Button>
          </Stack>
        </Card>
      ) : (
        <CurrentRoundCard
          round={currentRound.round}
          investments={currentRound.investments}
          total={currentRound.total}
          myUserId={user?.id}
        />
      )}

      <LeaderboardCard roomId={room._id} />
      <HistoryCard roomId={room._id} />
    </Stack>
  )
}

function RoomHeader({
  room,
  players,
}: {
  room: RoomData['room']
  players: RoomData['players']
}) {
  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" c="dimmed">
            ルームコード
          </Text>
          <Title order={2}>{room.code}</Title>
          <CopyButton value={room.code}>
            {({ copied, copy }) => (
              <Button size="xs" variant="light" color={copied ? 'teal' : undefined} onClick={copy}>
                {copied ? 'コピーしました' : 'コピー'}
              </Button>
            )}
          </CopyButton>
        </Group>
        <UserButton />
      </Group>
      <Text size="sm" c="dimmed">
        友達はこのコードで参加できます
      </Text>
      <Group gap="xs">
        {players.map((player) => (
          <Tooltip key={player._id} label={player.name}>
            <Avatar src={player.avatarUrl} radius="xl" color="violet">
              {player.name.slice(0, 1)}
            </Avatar>
          </Tooltip>
        ))}
      </Group>
    </Stack>
  )
}

function useCountdown(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  return ROUND_DURATION_MS - (now - startedAt)
}

type CurrentRound = NonNullable<FunctionReturnType<typeof api.game.currentRound>>

function CurrentRoundCard({
  round,
  investments,
  total,
  myUserId,
}: {
  round: CurrentRound['round']
  investments: CurrentRound['investments']
  total: number
  myUserId: string | undefined
}) {
  const endRound = useMutation(api.game.endRound)
  const [ending, setEnding] = useState(false)
  const remainingMs = useCountdown(round.startedAt)

  const isPitcher = myUserId !== undefined && myUserId === round.pitcherUserId
  const myInvestment = investments.find((inv) => inv.investorUserId === myUserId)

  const handleEnd = async () => {
    setEnding(true)
    try {
      await endRound({ roundId: round._id })
    } catch {
      // 既に終了済み・他の誰かが先に押しただけの可能性があるため無視する（冪等操作）
    } finally {
      setEnding(false)
    }
  }

  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const progress = Math.max(0, Math.min(100, (remainingMs / ROUND_DURATION_MS) * 100))

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Stack gap={4} align="center">
          <Text size="sm" c="dimmed">
            {round.pitcherName} さんがピッチ中！
          </Text>
          <Group gap="xs" justify="center" wrap="wrap">
            <Badge size="lg" color="grape">
              {round.themeTech}
            </Badge>
            <Text fw={700}>×</Text>
            <Badge size="lg" color="blue">
              {round.themeMarket}
            </Badge>
            <Text fw={700}>×</Text>
            <Badge size="lg" color="teal">
              {round.themeModel}
            </Badge>
          </Group>
        </Stack>

        <Group justify="center">
          <RingProgress
            size={120}
            thickness={10}
            roundCaps
            sections={[{ value: progress, color: remainingMs > 0 ? 'violet' : 'red' }]}
            label={
              <Text ta="center" fw={700} size="sm">
                {remainingMs > 0 ? `${remainingSec}秒` : '⏰ 時間切れ'}
              </Text>
            }
          />
        </Group>

        <Divider />

        <Text ta="center" size="xl" fw={700}>
          現在の調達額: {total}億円
        </Text>

        {isPitcher ? (
          <Alert color="violet" title="あなたのピッチ中！">
            熱く語れ🔥 みんなが出資額をジャッジしています。
          </Alert>
        ) : (
          <InvestForm roundId={round._id} myInvestment={myInvestment} />
        )}

        {investments.length > 0 && (
          <Stack gap="xs">
            {investments.map((inv) => (
              <Card key={inv._id} withBorder radius="sm" padding="xs">
                <Group justify="space-between" wrap="wrap">
                  <Text size="sm" fw={600}>
                    {inv.investorName}
                  </Text>
                  <Badge color="violet">{inv.amount}億円</Badge>
                </Group>
                {inv.comment && (
                  <Text size="xs" c="dimmed">
                    {inv.comment}
                  </Text>
                )}
              </Card>
            ))}
          </Stack>
        )}

        <Button variant="subtle" color="gray" onClick={handleEnd} loading={ending}>
          ピッチ終了
        </Button>
      </Stack>
    </Card>
  )
}

function InvestForm({
  roundId,
  myInvestment,
}: {
  roundId: Id<'rounds'>
  myInvestment: CurrentRound['investments'][number] | undefined
}) {
  const invest = useMutation(api.game.invest)
  const [amount, setAmount] = useState(myInvestment?.amount ?? 3)
  const [comment, setComment] = useState(myInvestment?.comment ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInvest = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await invest({ roundId, amount, comment: comment.trim() || undefined })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="sm">
      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}
      <Text size="sm">投資額: {amount}億円</Text>
      <Slider
        min={1}
        max={10}
        step={1}
        value={amount}
        onChange={setAmount}
        label={(value) => `${value}億円`}
        marks={[
          { value: 1, label: '1億' },
          { value: 10, label: '10億' },
        ]}
      />
      <TextInput
        placeholder="一言コメント（任意）"
        maxLength={50}
        value={comment}
        onChange={(event) => setComment(event.currentTarget.value)}
      />
      <Button size="lg" onClick={handleInvest} loading={submitting}>
        {myInvestment ? '出資額を変更' : '💰 出資する'}
      </Button>
    </Stack>
  )
}

function LeaderboardCard({ roomId }: { roomId: Id<'rooms'> }) {
  const leaderboard = useQuery(api.game.leaderboard, { roomId })
  const medals = ['🥇', '🥈', '🥉']

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Title order={4}>リーダーボード</Title>
        {leaderboard === undefined ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : leaderboard.length === 0 ? (
          <Text c="dimmed" size="sm">
            まだ誰もピッチしていません
          </Text>
        ) : (
          <Stack gap="xs">
            {leaderboard.map((entry, index) => (
              <Group key={entry.userId} justify="space-between" wrap="wrap">
                <Group gap="xs">
                  <Text fw={700}>{medals[index] ?? `${index + 1}位`}</Text>
                  <Text>{entry.name}</Text>
                </Group>
                <Group gap="xs">
                  <Text fw={700}>{entry.total}億円</Text>
                  <Text size="sm" c="dimmed">
                    ({entry.roundCount}回ピッチ)
                  </Text>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}

function HistoryCard({ roomId }: { roomId: Id<'rooms'> }) {
  const history = useQuery(api.game.history, { roomId })

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Title order={4}>これまでのピッチ</Title>
        {history === undefined ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : history.length === 0 ? (
          <Text c="dimmed" size="sm">
            まだ履歴がありません
          </Text>
        ) : (
          <Stack gap="xs">
            {history.map(({ round, total }) => (
              <Card key={round._id} withBorder radius="sm" padding="sm">
                <Group justify="space-between" wrap="wrap">
                  <Text size="sm" fw={600}>
                    {round.pitcherName}
                  </Text>
                  <Text size="sm" fw={700}>
                    {total}億円
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {round.themeTech} × {round.themeMarket} × {round.themeModel}
                </Text>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
