import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { SignInButton, UserButton } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/room/$code')({
  component: RoomComponent,
})

type RoomData = NonNullable<FunctionReturnType<typeof api.game.getRoom>>

function useCountdown(startedAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === undefined) {
      return
    }
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [startedAt])

  if (startedAt === undefined) {
    return 0
  }
  return Math.max(0, Math.ceil((startedAt + 60_000 - now) / 1000))
}

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
          <Stack gap="md" py="xl">
            <Title order={2}>ログインしてください</Title>
            <SignInButton mode="modal">
              <Button size="md">Googleでログイン</Button>
            </SignInButton>
          </Stack>
        </Unauthenticated>

        <Authenticated>
          <RoomView code={code} />
        </Authenticated>
      </Stack>
    </Container>
  )
}

function RoomView({ code }: { code: string }) {
  const data = useQuery(api.game.getRoom, { code })
  const joinRoom = useMutation(api.game.joinRoom)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  if (data === undefined) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    )
  }

  if (data === null) {
    return (
      <Stack gap="md" py="xl">
        <Title order={2}>ルームが見つかりません</Title>
        <Link to="/">トップへ戻る</Link>
      </Stack>
    )
  }

  const handleJoin = async () => {
    setError(null)
    setJoining(true)
    try {
      await joinRoom({ code })
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加に失敗しました')
    } finally {
      setJoining(false)
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Badge size="lg" variant="light">
          合言葉: {data.room.code}
        </Badge>
        <UserButton />
      </Group>

      {error && (
        <Alert color="red" title="エラー" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      {!data.isMember ? (
        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Text>このルームに参加しますか？</Text>
            <Button onClick={handleJoin} loading={joining} disabled={joining}>
              このルームに参加する
            </Button>
          </Stack>
        </Card>
      ) : data.room.status === 'lobby' ? (
        <LobbyView code={code} data={data} onError={setError} />
      ) : data.room.status === 'playing' ? (
        <PlayingView code={code} data={data} onError={setError} />
      ) : (
        <FinishedView data={data} />
      )}
    </Stack>
  )
}

function LobbyView({
  code,
  data,
  onError,
}: {
  code: string
  data: RoomData
  onError: (message: string | null) => void
}) {
  const startRound = useMutation(api.game.startRound)
  const [starting, setStarting] = useState(false)

  const canStart = data.players.length >= 2

  const handleStart = async () => {
    onError(null)
    setStarting(true)
    try {
      await startRound({ code })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ゲームの開始に失敗しました')
    } finally {
      setStarting(false)
    }
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs" align="center">
          <Text size="sm" c="dimmed">
            👆この合言葉を仲間に共有！
          </Text>
          <Title order={1} style={{ letterSpacing: '0.3em' }}>
            {data.room.code}
          </Title>
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={3}>参加者（{data.players.length}人）</Title>
          <Stack gap="xs">
            {data.players.map((player) => (
              <Group key={player.userId} justify="space-between">
                <Text>
                  {player.isHost ? '👑 ' : ''}
                  {player.name}
                </Text>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Card>

      {data.isHost ? (
        <Stack gap="xs">
          <Button size="md" onClick={handleStart} loading={starting} disabled={starting || !canStart}>
            🎲 ゲーム開始
          </Button>
          {!canStart && (
            <Text size="sm" c="dimmed" ta="center">
              2人以上で開始できます
            </Text>
          )}
        </Stack>
      ) : (
        <Text ta="center" c="dimmed">
          ホストの開始を待っています…
        </Text>
      )}
    </Stack>
  )
}

function PlayingView({
  code,
  data,
  onError,
}: {
  code: string
  data: RoomData
  onError: (message: string | null) => void
}) {
  const round = data.currentRound
  if (!round) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    )
  }

  return round.status === 'open' ? (
    <OpenRoundView code={code} data={data} round={round} onError={onError} />
  ) : (
    <ClosedRoundView code={code} data={data} round={round} onError={onError} />
  )
}

function OpenRoundView({
  code,
  data,
  round,
  onError,
}: {
  code: string
  data: RoomData
  round: NonNullable<RoomData['currentRound']>
  onError: (message: string | null) => void
}) {
  const invest = useMutation(api.game.invest)
  const closeRound = useMutation(api.game.closeRound)
  const remaining = useCountdown(round.startedAt)

  const [amount, setAmount] = useState<number | null>(round.myInvestment?.amount ?? null)
  const [comment, setComment] = useState(round.myInvestment?.comment ?? '')
  const [investing, setInvesting] = useState(false)
  const [closing, setClosing] = useState(false)

  const isPitcher = round.pitcherId === data.me.userId
  const totalRaised = round.investments.reduce((sum, inv) => sum + inv.amount, 0)

  const handleInvest = async () => {
    if (amount === null) {
      return
    }
    onError(null)
    setInvesting(true)
    try {
      await invest({ roundId: round._id, amount, comment })
    } catch (err) {
      onError(err instanceof Error ? err.message : '投資に失敗しました')
    } finally {
      setInvesting(false)
    }
  }

  const handleClose = async () => {
    onError(null)
    setClosing(true)
    try {
      await closeRound({ code })
    } catch (err) {
      onError(err instanceof Error ? err.message : '締め切りに失敗しました')
    } finally {
      setClosing(false)
    }
  }

  return (
    <Stack gap="lg">
      <Stack gap={4} align="center">
        <Text c="dimmed">Round {round.index + 1}</Text>
        <Title order={2}>🎤 ピッチャー: {round.pitcherName}</Title>
        <Text size="sm" c={remaining <= 0 ? 'red' : 'dimmed'}>
          {remaining > 0 ? `残り ${remaining} 秒` : '⏰ 時間切れ！投資タイム！'}
        </Text>
      </Stack>

      <SimpleGrid cols={3} spacing="xs">
        <Card withBorder radius="md" padding="sm">
          <Text size="xs" c="dimmed" ta="center">
            ターゲット
          </Text>
          <Text fw={700} ta="center">
            {round.theme.target}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="sm">
          <Text size="xs" c="dimmed" ta="center">
            テック
          </Text>
          <Text fw={700} ta="center">
            {round.theme.tech}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="sm">
          <Text size="xs" c="dimmed" ta="center">
            収益モデル
          </Text>
          <Text fw={700} ta="center">
            {round.theme.model}
          </Text>
        </Card>
      </SimpleGrid>

      {isPitcher ? (
        <Alert color="orange" title="🔥 あなたの番！熱くピッチせよ！">
          みんなが投資してくれるように、無茶振りお題を熱く語ろう。
        </Alert>
      ) : (
        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Title order={4}>💰 投資する</Title>
            {round.myInvestment && (
              <Text size="sm" c="dimmed">
                現在の投資額: {round.myInvestment.amount}億円
              </Text>
            )}
            <Chip.Group
              value={amount === null ? '' : String(amount)}
              onChange={(value) => {
                const num = Number(value)
                setAmount(Number.isFinite(num) && num > 0 ? num : null)
              }}
            >
              <Group gap="xs">
                {data.amounts.map((a) => (
                  <Chip key={a} value={String(a)}>
                    {a}億円
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            <TextInput
              placeholder="辛口コメントをどうぞ（任意）"
              maxLength={50}
              value={comment}
              onChange={(event) => setComment(event.currentTarget.value)}
            />
            <Button onClick={handleInvest} disabled={amount === null || investing} loading={investing}>
              💰 {round.myInvestment ? '投資を変更' : '投資する'}
            </Button>
          </Stack>
        </Card>
      )}

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={4}>投資フィード</Title>
            <Text fw={700}>合計 {totalRaised}億円</Text>
          </Group>
          {round.investments.length === 0 ? (
            <Text c="dimmed" size="sm">
              まだ投資がありません
            </Text>
          ) : (
            <Stack gap="xs">
              {round.investments.map((inv) => (
                <Group key={inv.investorId} justify="space-between" wrap="nowrap">
                  <Text size="sm" style={{ wordBreak: 'break-word' }}>
                    {inv.investorName}
                    {inv.comment ? `「${inv.comment}」` : ''}
                  </Text>
                  <Badge variant="light">{inv.amount}億円</Badge>
                </Group>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>

      {data.isHost && (
        <Button color="red" onClick={handleClose} loading={closing} disabled={closing}>
          🔨 締め切って結果発表
        </Button>
      )}
    </Stack>
  )
}

function ClosedRoundView({
  code,
  data,
  round,
  onError,
}: {
  code: string
  data: RoomData
  round: NonNullable<RoomData['currentRound']>
  onError: (message: string | null) => void
}) {
  const startRound = useMutation(api.game.startRound)
  const finishGame = useMutation(api.game.finishGame)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const sortedInvestments = [...round.investments].sort((a, b) => b.amount - a.amount)
  const sortedPlayers = [...data.players].sort((a, b) => b.totalRaised - a.totalRaised)

  const handleNextRound = async () => {
    onError(null)
    setStarting(true)
    try {
      await startRound({ code })
    } catch (err) {
      onError(err instanceof Error ? err.message : '次のラウンドの開始に失敗しました')
    } finally {
      setStarting(false)
    }
  }

  const handleFinish = async () => {
    onError(null)
    setFinishing(true)
    try {
      await finishGame({ code })
    } catch (err) {
      onError(err instanceof Error ? err.message : '終了処理に失敗しました')
    } finally {
      setFinishing(false)
    }
  }

  return (
    <Stack gap="lg">
      <Stack gap={4} align="center">
        <Title order={2} ta="center">
          🎉 {round.pitcherName} さん、{round.raised}億円 調達！
        </Title>
      </Stack>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={4}>投資一覧</Title>
          {sortedInvestments.length === 0 ? (
            <Text c="dimmed" size="sm">
              投資はありませんでした
            </Text>
          ) : (
            <Stack gap="xs">
              {sortedInvestments.map((inv) => (
                <Group key={inv.investorId} justify="space-between" wrap="nowrap">
                  <Text size="sm" style={{ wordBreak: 'break-word' }}>
                    {inv.investorName}
                    {inv.comment ? `「${inv.comment}」` : ''}
                  </Text>
                  <Badge variant="light">{inv.amount}億円</Badge>
                </Group>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>

      <RankingTable players={sortedPlayers} />

      {data.isHost && (
        <Group grow>
          <Button onClick={handleNextRound} loading={starting} disabled={starting || finishing}>
            ▶ 次のラウンド
          </Button>
          <Button color="red" variant="outline" onClick={handleFinish} loading={finishing} disabled={starting || finishing}>
            🏁 結果発表して終了
          </Button>
        </Group>
      )}
    </Stack>
  )
}

function FinishedView({ data }: { data: RoomData }) {
  const sortedPlayers = [...data.players].sort((a, b) => b.totalRaised - a.totalRaised)
  const winner = sortedPlayers[0]

  return (
    <Stack gap="lg">
      <Title order={2} ta="center">
        🏆 最終結果発表
      </Title>

      {winner && (
        <Card withBorder radius="md" padding="lg">
          <Stack gap={4} align="center">
            <Text size="xl">👑</Text>
            <Title order={3}>{winner.name}</Title>
            <Text c="dimmed">累計調達額 {winner.totalRaised}億円</Text>
          </Stack>
        </Card>
      )}

      <RankingTable players={sortedPlayers} />

      <Link to="/">トップに戻る</Link>
    </Stack>
  )
}

function RankingTable({ players }: { players: RoomData['players'] }) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Title order={4}>ランキング</Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>順位</Table.Th>
              <Table.Th>名前</Table.Th>
              <Table.Th>累計調達額</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {players.map((player, index) => (
              <Table.Tr key={player.userId}>
                <Table.Td>{index === 0 ? '👑 1' : index + 1}</Table.Td>
                <Table.Td>{player.name}</Table.Td>
                <Table.Td>{player.totalRaised}億円</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  )
}
