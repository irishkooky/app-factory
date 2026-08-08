import { Suspense, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  CopyButton,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { getDeviceId } from '../lib/deviceId'
import { useCountdownSeconds } from '../lib/useCountdown'

type RoomSearch = { spectate?: boolean }

export const Route = createFileRoute('/room/$code')({
  // spectateはオプショナルにしておく（navigate({ to: '/room/$code', params }) 側でsearchを
  // 必須にしないため。値なし＝falseとして扱うのでキー自体を省略してよい）
  validateSearch: (search: Record<string, unknown>): RoomSearch => {
    const raw = search.spectate
    // ?spectate（値なし。URLSearchParamsでは空文字になる） と ?spectate=1 の両方をtrueとして扱う
    const spectate = raw === '' || raw === '1' || raw === 1 || raw === true
    return spectate ? { spectate: true } : {}
  },
  component: RoomRoute,
})

type RoomDoc = NonNullable<FunctionReturnType<typeof api.rooms.getRoom>>
type SeatSummary = FunctionReturnType<typeof api.rooms.listSeats>[number]
type MySeatDoc = NonNullable<FunctionReturnType<typeof api.rooms.getMySeat>>

const PHASE_LABELS: Record<RoomDoc['phase'], string> = {
  lobby: 'ロビー',
  answering: '回答中',
  reveal: '公開',
  discussion: '会話',
  voting: '投票中',
  result: '結果',
}

type PhaseProps = {
  code: string
  room: RoomDoc
  seats: SeatSummary[]
  mySeat: MySeatDoc
  deviceId: string
}

// ---------- ルート ----------

function RoomRoute() {
  const { code } = Route.useParams()
  const { spectate = false } = Route.useSearch()
  const { data: room } = useSuspenseQuery(convexQuery(api.rooms.getRoom, { code }))

  if (!room) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="md" align="center">
          <Title order={2}>部屋が見つかりません</Title>
          <Text c="dimmed" ta="center">
            ルームコード「{code}」の部屋は存在しないか、終了した可能性があります。
          </Text>
          <Button component={Link} to="/">
            トップへ戻る
          </Button>
        </Stack>
      </Container>
    )
  }

  if (spectate) {
    return <SpectatorRoom code={code} room={room} />
  }

  return <RoomShell code={code} room={room} />
}

// ---------- 部屋の外枠（自席の解決） ----------

function RoomShell({ code, room }: { code: string; room: RoomDoc }) {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  useEffect(() => {
    setDeviceId(getDeviceId())
  }, [])

  const { data: seats } = useSuspenseQuery(
    convexQuery(api.rooms.listSeats, { roomId: room._id }),
  )
  const { data: mySeat } = useQuery({
    ...convexQuery(api.rooms.getMySeat, {
      roomId: room._id,
      deviceId: deviceId ?? '',
    }),
    enabled: deviceId !== null,
  })

  if (deviceId === null || mySeat === undefined) {
    return (
      <Container size="sm" py="xl">
        <Center py="xl">
          <Loader />
        </Center>
      </Container>
    )
  }

  if (mySeat === null) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="md" align="center">
          <Title order={2}>この部屋には参加していません</Title>
          <Text c="dimmed" ta="center">
            トップページからルームコード「{code}」で入室してください。
          </Text>
          <Button component={Link} to="/">
            トップへ戻る
          </Button>
        </Stack>
      </Container>
    )
  }

  const phaseProps: PhaseProps = { code, room, seats, mySeat, deviceId }

  return (
    <Container size="sm" py="xl" pb={80}>
      <Stack gap="lg">
        <RoomHeader code={code} room={room} mySeat={mySeat} />

        {room.phase === 'lobby' && <LobbyPhase {...phaseProps} />}
        {room.phase === 'answering' && <AnsweringPhase {...phaseProps} />}
        {room.phase === 'reveal' && <RevealPhase {...phaseProps} />}
        {room.phase === 'discussion' && <DiscussionPhase {...phaseProps} />}
        {room.phase === 'voting' && <VotingPhase {...phaseProps} />}
        {room.phase === 'result' && <ResultPhase {...phaseProps} />}
      </Stack>
    </Container>
  )
}

// ---------- 共通ヘッダ ----------

function RoomHeader({
  code,
  room,
  mySeat,
}: {
  code: string
  room: RoomDoc
  mySeat: MySeatDoc
}) {
  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Stack gap={0}>
          <Text size="xs" c="dimmed">
            ルームコード
          </Text>
          <Text fw={700}>{code}</Text>
        </Stack>
        <Stack gap={0} align="flex-end">
          <Text size="xs" c="dimmed">
            あなた
          </Text>
          <Text fw={600}>{mySeat.alias}</Text>
        </Stack>
      </Group>
      <Divider my="xs" />
      <Group justify="space-between">
        <Badge variant="light">{PHASE_LABELS[room.phase]}</Badge>
        {room.phase !== 'lobby' && (
          <Text size="xs" c="dimmed">
            ラウンド {room.roundIndex + 1} / {room.totalRounds}
          </Text>
        )}
      </Group>
    </Card>
  )
}

// ---------- lobby ----------

function LobbyPhase({ code, room, seats, mySeat, deviceId }: PhaseProps) {
  const startGame = useMutation(api.game.startGame)
  const [isStarting, setIsStarting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canStart = seats.length >= 2

  // 観戦用URLはクライアント側でのみ組み立てる（SSRにはwindowが無い）
  const [spectateUrl, setSpectateUrl] = useState('')
  useEffect(() => {
    setSpectateUrl(`${window.location.origin}/room/${code}?spectate=1`)
  }, [code])

  async function handleStart() {
    setIsStarting(true)
    setErrorMessage(null)
    try {
      await startGame({ roomId: room._id, deviceId })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'ゲームを開始できませんでした')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs" align="center">
          <Text size="sm" c="dimmed">
            このコードを友達にシェアしよう
          </Text>
          <Title order={1} ta="center" style={{ letterSpacing: '0.3em' }}>
            {code}
          </Title>
          <Group gap="xs">
            <CopyButton value={code}>
              {({ copied, copy }) => (
                <Button size="xs" variant="light" onClick={copy}>
                  {copied ? 'コピーしました' : 'コードをコピー'}
                </Button>
              )}
            </CopyButton>
            <CopyButton value={spectateUrl}>
              {({ copied, copy }) => (
                <Button size="xs" variant="subtle" onClick={copy} disabled={!spectateUrl}>
                  {copied ? 'コピーしました' : '観戦用URLをコピー'}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={4}>参加者（{seats.length}人）</Title>
          <Group gap="xs">
            {seats.map((seat) => (
              <Badge
                key={seat.seatId}
                variant={seat.seatId === mySeat.seatId ? 'filled' : 'light'}
              >
                {seat.alias}
                {seat.seatId === mySeat.seatId ? '（あなた）' : ''}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Card>

      {mySeat.isHost ? (
        <Stack gap={4}>
          <Button size="lg" onClick={handleStart} loading={isStarting} disabled={!canStart}>
            ゲーム開始
          </Button>
          {!canStart && (
            <Text size="sm" c="dimmed" ta="center">
              開始するには、あと{Math.max(0, 2 - seats.length)}人必要です
            </Text>
          )}
        </Stack>
      ) : (
        <Alert color="gray" variant="light">
          ホストの開始を待っています…
        </Alert>
      )}

      {errorMessage && <Alert color="red">{errorMessage}</Alert>}
    </Stack>
  )
}

// ---------- answering ----------

function AnsweringPhase({ room, seats, mySeat, deviceId }: PhaseProps) {
  const submitAnswer = useMutation(api.game.submitAnswer)
  const { data: answersResult } = useSuspenseQuery(
    convexQuery(api.game.listAnswers, { roomId: room._id, roundIndex: room.roundIndex }),
  )
  const remainingSeconds = useCountdownSeconds(room.deadlineAt)

  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submittedSeatIds =
    answersResult.phase === 'hidden'
      ? answersResult.submittedSeatIds
      : answersResult.answers.map((a) => a.seatId)
  const hasSubmitted = submittedSeatIds.includes(mySeat.seatId)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || hasSubmitted || text.trim().length === 0) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await submitAnswer({ roomId: room._id, deviceId, text })
      setText('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start">
            <Text size="sm" c="dimmed">
              お題
            </Text>
            {remainingSeconds !== null && (
              <Badge color={remainingSeconds <= 10 ? 'red' : 'gray'} variant="light">
                残り{remainingSeconds}秒
              </Badge>
            )}
          </Group>
          <Title order={2}>{room.promptText}</Title>
        </Stack>
      </Card>

      {room.roundIndex === 0 && (
        <Text size="xs" c="dimmed" ta="center">
          ※ゲーム開始時に全員の仮名を振り直しました
        </Text>
      )}

      <Card withBorder radius="md" padding="lg">
        {hasSubmitted ? (
          <Alert color="green" variant="light">
            送信済みです。全員そろうまでお待ちください。
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <Textarea
                placeholder="お題への回答を入力（120文字以内）"
                autosize
                minRows={2}
                maxLength={120}
                value={text}
                onChange={(event) => setText(event.currentTarget.value)}
                autoFocus
              />
              {errorMessage && (
                <Text c="red" size="sm">
                  {errorMessage}
                </Text>
              )}
              <Button type="submit" loading={isSubmitting} disabled={text.trim().length === 0}>
                回答を送信
              </Button>
            </Stack>
          </form>
        )}
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={600}>回答状況</Text>
            <Badge>
              {submittedSeatIds.length} / {seats.length} 人
            </Badge>
          </Group>
          <Group gap="xs">
            {seats.map((seat) => {
              const submitted = submittedSeatIds.includes(seat.seatId)
              return (
                <Badge
                  key={seat.seatId}
                  variant={submitted ? 'filled' : 'outline'}
                  color={submitted ? 'green' : 'gray'}
                >
                  {submitted ? '✓ ' : ''}
                  {seat.alias}
                </Badge>
              )
            })}
          </Group>
        </Stack>
      </Card>
    </Stack>
  )
}

// ---------- reveal ----------

function RevealPhase({ room, seats, mySeat, deviceId }: PhaseProps) {
  const nextRound = useMutation(api.game.nextRound)
  const { data: answersResult } = useSuspenseQuery(
    convexQuery(api.game.listAnswers, { roomId: room._id, roundIndex: room.roundIndex }),
  )

  const [isAdvancing, setIsAdvancing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const answersBySeat = new Map<Id<'seats'>, string>(
    answersResult.phase === 'open' ? answersResult.answers.map((a) => [a.seatId, a.text]) : [],
  )

  async function handleNext() {
    setIsAdvancing(true)
    setErrorMessage(null)
    try {
      await nextRound({ roomId: room._id, deviceId })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '進行に失敗しました')
    } finally {
      setIsAdvancing(false)
    }
  }

  const isLastRound = room.roundIndex + 1 >= room.totalRounds

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            お題
          </Text>
          <Title order={3}>{room.promptText}</Title>
        </Stack>
      </Card>

      <Stack gap="sm">
        {seats.map((seat) => (
          <Card key={seat.seatId} withBorder radius="md" padding="md">
            <Text fw={600}>
              {seat.alias}
              {seat.seatId === mySeat.seatId ? '（あなた）' : ''}
            </Text>
            <Text mt={4}>{answersBySeat.get(seat.seatId) ?? '（未回答）'}</Text>
          </Card>
        ))}
      </Stack>

      {mySeat.isHost ? (
        <Button size="lg" onClick={handleNext} loading={isAdvancing}>
          {isLastRound ? '次へ（自由会話へ）' : '次のラウンドへ'}
        </Button>
      ) : (
        <Alert color="gray" variant="light">
          ホストの操作を待っています…
        </Alert>
      )}

      {errorMessage && <Alert color="red">{errorMessage}</Alert>}
    </Stack>
  )
}

// ---------- discussion ----------

function DiscussionPhase({ room, seats, mySeat, deviceId }: PhaseProps) {
  const nextRound = useMutation(api.game.nextRound)
  const sendMessage = useMutation(api.game.sendMessage)
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.game.listMessages, { roomId: room._id }),
  )

  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const aliasBySeat = new Map(seats.map((seat) => [seat.seatId, seat.alias]))

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    setIsSending(true)
    setErrorMessage(null)
    try {
      await sendMessage({ roomId: room._id, deviceId, text: trimmed })
      setText('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '送信に失敗しました')
    } finally {
      setIsSending(false)
    }
  }

  async function handleAdvance() {
    setIsAdvancing(true)
    setErrorMessage(null)
    try {
      await nextRound({ roomId: room._id, deviceId })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '進行に失敗しました')
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Text fw={600}>自由に会話しましょう。怪しいと思った人に探りを入れてみては？</Text>
      </Card>

      <Card withBorder radius="md" padding="md">
        <Stack gap="sm" mah={360} style={{ overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <Text size="sm" c="dimmed">
              まだ発言がありません。最初のひとことをどうぞ。
            </Text>
          ) : (
            messages.map((m) => (
              <Stack key={`${m._creationTime}-${m.seatId}`} gap={0}>
                <Text size="xs" c="dimmed">
                  {aliasBySeat.get(m.seatId) ?? '?'}
                  {m.seatId === mySeat.seatId ? '（あなた）' : ''}
                </Text>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{m.text}</Text>
              </Stack>
            ))
          )}
        </Stack>
      </Card>

      <form onSubmit={handleSend}>
        <Group gap="xs" wrap="nowrap" align="flex-end">
          <Textarea
            style={{ flex: 1 }}
            placeholder="発言を入力（200文字以内）"
            autosize
            minRows={1}
            maxRows={4}
            maxLength={200}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
          />
          <Button type="submit" loading={isSending} disabled={text.trim().length === 0}>
            送信
          </Button>
        </Group>
      </form>

      {mySeat.isHost ? (
        <Button variant="light" onClick={handleAdvance} loading={isAdvancing}>
          投票へ進む
        </Button>
      ) : (
        <Text size="xs" c="dimmed" ta="center">
          時間になると自動で投票フェーズに進みます
        </Text>
      )}

      {errorMessage && <Alert color="red">{errorMessage}</Alert>}
    </Stack>
  )
}

// ---------- voting ----------

function VotingPhase({ room, seats, mySeat, deviceId }: PhaseProps) {
  const castVote = useMutation(api.game.castVote)
  const { data: voteStatus } = useSuspenseQuery(
    convexQuery(api.game.getVoteStatus, { roomId: room._id }),
  )
  // 自分の投票先はサーバーの購読結果から表示する（ローカルstateだとリロードで消え、
  // castVote失敗時に選択表示が実際とズレるため）。
  const { data: myVote } = useSuspenseQuery(
    convexQuery(api.game.getMyVote, { roomId: room._id, deviceId }),
  )
  const remainingSeconds = useCountdownSeconds(room.deadlineAt)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleVote(targetSeatId: Id<'seats'>) {
    setErrorMessage(null)
    try {
      await castVote({ roomId: room._id, deviceId, targetSeatId })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '投票に失敗しました')
    }
  }

  const roundIndices = Array.from({ length: room.totalRounds }, (_, i) => i)

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start">
            <Text fw={600}>AI席だと思う席に投票してください</Text>
            {remainingSeconds !== null && (
              <Badge color={remainingSeconds <= 10 ? 'red' : 'gray'} variant="light">
                残り{remainingSeconds}秒
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed">
            投票後も選び直せます
          </Text>
          <Badge w="fit-content">
            {voteStatus.votedCount} / {voteStatus.totalSeats} 人が投票済み
          </Badge>
        </Stack>
      </Card>

      <Stack gap="xs">
        {seats
          .filter((seat) => seat.seatId !== mySeat.seatId)
          .map((seat) => {
            const isSelected = myVote?.targetSeatId === seat.seatId
            return (
              <Card
                key={seat.seatId}
                component="button"
                type="button"
                withBorder
                radius="md"
                padding="md"
                onClick={() => handleVote(seat.seatId)}
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  font: 'inherit',
                  color: 'inherit',
                  borderColor: isSelected ? 'var(--mantine-primary-color-6)' : undefined,
                  borderWidth: isSelected ? 2 : undefined,
                }}
              >
                <Group justify="space-between">
                  <Text fw={600}>{seat.alias}</Text>
                  {isSelected && <Badge>選択中</Badge>}
                </Group>
              </Card>
            )
          })}
      </Stack>

      {errorMessage && <Alert color="red">{errorMessage}</Alert>}

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={4}>これまでの回答を見返す</Title>
          <Suspense fallback={<Loader size="sm" />}>
            <Accordion variant="separated">
              {roundIndices.map((roundIndex) => (
                <RoundAnswersItem
                  key={roundIndex}
                  roomId={room._id}
                  roundIndex={roundIndex}
                  seats={seats}
                  isCurrent={roundIndex === room.roundIndex}
                />
              ))}
            </Accordion>
          </Suspense>
        </Stack>
      </Card>
    </Stack>
  )
}

function RoundAnswersItem({
  roomId,
  roundIndex,
  seats,
  isCurrent,
}: {
  roomId: Id<'rooms'>
  roundIndex: number
  seats: SeatSummary[]
  isCurrent: boolean
}) {
  const { data: answersResult } = useSuspenseQuery(
    convexQuery(api.game.listAnswers, { roomId, roundIndex }),
  )
  const answersBySeat = new Map<Id<'seats'>, string>(
    answersResult.phase === 'open' ? answersResult.answers.map((a) => [a.seatId, a.text]) : [],
  )

  return (
    <Accordion.Item value={String(roundIndex)}>
      <Accordion.Control>
        ラウンド {roundIndex + 1}
        {isCurrent ? '（今回）' : ''}
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap={4}>
          {seats.map((seat) => (
            <Text key={seat.seatId} size="sm">
              <b>{seat.alias}</b>: {answersBySeat.get(seat.seatId) ?? '（回答なし）'}
            </Text>
          ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  )
}

// ---------- result ----------

function ResultPhase({ room, seats, mySeat }: PhaseProps) {
  const { data: result } = useSuspenseQuery(convexQuery(api.game.getResult, { roomId: room._id }))

  if (!result) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )
  }

  const aiSeat = seats.find((seat) => seat.seatId === result.aiSeatId)

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs" align="center">
          <Text size="sm" c="dimmed">
            AIの正体は…
          </Text>
          <Title order={1} ta="center">
            {aiSeat?.alias ?? '不明'} でした
          </Title>
        </Stack>
      </Card>

      <Alert
        color={result.humansWin ? 'green' : 'red'}
        title={result.humansWin ? '人間側の勝ち！' : 'AIの勝ち！'}
        variant="filled"
      >
        {result.humansWin
          ? 'AI席が最多得票でした。見事に見破りました。'
          : 'AI席は最多得票ではありませんでした。AIに騙されてしまいました。'}
      </Alert>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs">
          <Title order={4}>得票結果</Title>
          {result.tally.map((t) => {
            const seat = seats.find((s) => s.seatId === t.seatId)
            const isAi = t.seatId === result.aiSeatId
            return (
              <Group key={t.seatId} justify="space-between">
                <Text fw={isAi ? 700 : 400}>
                  {seat?.alias ?? '?'}
                  {isAi ? '（AI）' : ''}
                  {t.seatId === mySeat.seatId ? '（あなた）' : ''}
                </Text>
                <Badge color={isAi ? 'red' : 'gray'}>{t.count}票</Badge>
              </Group>
            )
          })}
        </Stack>
      </Card>

      <Button component={Link} to="/" size="lg">
        トップへ戻る
      </Button>
    </Stack>
  )
}

// =====================================================================================
// 観戦モード（?spectate）— プロジェクタに出す用。deviceIdを使わず、入力・投票UIを一切出さない。
// =====================================================================================

function SpectatorRoom({ code, room }: { code: string; room: RoomDoc }) {
  const { data: seats } = useSuspenseQuery(
    convexQuery(api.rooms.listSeats, { roomId: room._id }),
  )

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <SpectatorHeader code={code} room={room} />

        {room.phase === 'lobby' && <SpectatorLobby seats={seats} />}
        {room.phase === 'answering' && <SpectatorAnswering room={room} seats={seats} />}
        {room.phase === 'reveal' && <SpectatorReveal room={room} seats={seats} />}
        {room.phase === 'discussion' && <SpectatorDiscussion room={room} seats={seats} />}
        {room.phase === 'voting' && <SpectatorVoting room={room} />}
        {room.phase === 'result' && <SpectatorResult room={room} seats={seats} />}
      </Stack>
    </Container>
  )
}

function SpectatorHeader({ code, room }: { code: string; room: RoomDoc }) {
  return (
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Group gap="sm">
        <Badge size="lg" color="grape" variant="filled">
          観戦モード
        </Badge>
        <Text fz={28} fw={800}>
          ルーム {code}
        </Text>
      </Group>
      <Badge size="lg" variant="light">
        {PHASE_LABELS[room.phase]}
        {room.phase !== 'lobby' ? `（ラウンド${room.roundIndex + 1}/${room.totalRounds}）` : ''}
      </Badge>
    </Group>
  )
}

function SpectatorLobby({ seats }: { seats: SeatSummary[] }) {
  return (
    <Card withBorder radius="md" padding="xl">
      <Stack gap="lg" align="center">
        <Text fz={24} c="dimmed">
          参加者（{seats.length}人）
        </Text>
        <Group gap="sm" justify="center">
          {seats.map((seat) => (
            <Badge key={seat.seatId} size="xl" variant="light">
              {seat.alias}
            </Badge>
          ))}
        </Group>
      </Stack>
    </Card>
  )
}

function SpectatorAnswering({ room, seats }: { room: RoomDoc; seats: SeatSummary[] }) {
  const { data: answersResult } = useSuspenseQuery(
    convexQuery(api.game.listAnswers, { roomId: room._id, roundIndex: room.roundIndex }),
  )
  const submittedSeatIds =
    answersResult.phase === 'hidden'
      ? answersResult.submittedSeatIds
      : answersResult.answers.map((a) => a.seatId)
  const allSubmitted = submittedSeatIds.length === seats.length

  return (
    <Stack gap="xl" align="center">
      <Text fz={40} fw={800} ta="center">
        {room.promptText}
      </Text>
      <Text fz={32} fw={700} c={allSubmitted ? 'green' : undefined}>
        {submittedSeatIds.length} / {seats.length} 人が回答済み
      </Text>
      <Group gap="sm" justify="center">
        {seats.map((seat) => {
          const submitted = submittedSeatIds.includes(seat.seatId)
          return (
            <Badge
              key={seat.seatId}
              size="xl"
              variant={submitted ? 'filled' : 'outline'}
              color={submitted ? 'green' : 'gray'}
            >
              {submitted ? '✓ ' : ''}
              {seat.alias}
            </Badge>
          )
        })}
      </Group>
    </Stack>
  )
}

function SpectatorReveal({ room, seats }: { room: RoomDoc; seats: SeatSummary[] }) {
  const { data: answersResult } = useSuspenseQuery(
    convexQuery(api.game.listAnswers, { roomId: room._id, roundIndex: room.roundIndex }),
  )
  const answersBySeat = new Map<Id<'seats'>, string>(
    answersResult.phase === 'open' ? answersResult.answers.map((a) => [a.seatId, a.text]) : [],
  )

  return (
    <Stack gap="lg">
      <Text fz={32} fw={800} ta="center">
        {room.promptText}
      </Text>
      <Stack gap="md">
        {seats.map((seat) => (
          <Card key={seat.seatId} withBorder radius="md" padding="lg">
            <Text fz={18} c="dimmed">
              {seat.alias}
            </Text>
            <Text fz={28} fw={600}>
              {answersBySeat.get(seat.seatId) ?? '（未回答）'}
            </Text>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}

function SpectatorDiscussion({ room, seats }: { room: RoomDoc; seats: SeatSummary[] }) {
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.game.listMessages, { roomId: room._id }),
  )
  const aliasBySeat = new Map(seats.map((seat) => [seat.seatId, seat.alias]))
  const recentMessages = messages.slice(-12)

  return (
    <Stack gap="md">
      <Text fz={32} fw={800} ta="center">
        自由会話中
      </Text>
      <Stack gap="sm">
        {recentMessages.length === 0 ? (
          <Text fz={20} c="dimmed" ta="center">
            まだ発言がありません
          </Text>
        ) : (
          recentMessages.map((m) => (
            <Card key={`${m._creationTime}-${m.seatId}`} withBorder radius="md" padding="md">
              <Text fz={14} c="dimmed">
                {aliasBySeat.get(m.seatId) ?? '?'}
              </Text>
              <Text fz={22}>{m.text}</Text>
            </Card>
          ))
        )}
      </Stack>
    </Stack>
  )
}

function SpectatorVoting({ room }: { room: RoomDoc }) {
  const { data: voteStatus } = useSuspenseQuery(
    convexQuery(api.game.getVoteStatus, { roomId: room._id }),
  )
  return (
    <Stack gap="xl" align="center">
      <Text fz={32} fw={800}>
        投票中
      </Text>
      <Text fz={56} fw={800}>
        {voteStatus.votedCount} / {voteStatus.totalSeats}
      </Text>
      <Text fz={22} c="dimmed">
        人が投票済み
      </Text>
    </Stack>
  )
}

function SpectatorResult({ room, seats }: { room: RoomDoc; seats: SeatSummary[] }) {
  const { data: result } = useSuspenseQuery(convexQuery(api.game.getResult, { roomId: room._id }))

  if (!result) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )
  }

  const aiSeat = seats.find((seat) => seat.seatId === result.aiSeatId)

  return (
    <Stack gap="xl" align="center">
      <Text fz={22} c="dimmed">
        AIの正体は…
      </Text>
      <Text fz={56} fw={800} ta="center">
        {aiSeat?.alias ?? '不明'}
      </Text>
      <Badge size="xl" color={result.humansWin ? 'green' : 'red'} variant="filled">
        {result.humansWin ? '人間側の勝ち！' : 'AIの勝ち！'}
      </Badge>
      <Stack gap="xs" w="100%" maw={480}>
        {result.tally.map((t) => {
          const seat = seats.find((s) => s.seatId === t.seatId)
          const isAi = t.seatId === result.aiSeatId
          return (
            <Group key={t.seatId} justify="space-between">
              <Text fz={20} fw={isAi ? 700 : 400}>
                {seat?.alias ?? '?'}
                {isAi ? '（AI）' : ''}
              </Text>
              <Badge size="lg" color={isAi ? 'red' : 'gray'}>
                {t.count}票
              </Badge>
            </Group>
          )
        })}
      </Stack>
    </Stack>
  )
}
