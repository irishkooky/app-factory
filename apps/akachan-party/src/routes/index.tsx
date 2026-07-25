import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { OracleScreen } from '../components/OracleScreen'
import { RevealScreen } from '../components/RevealScreen'
import { ScoreBoard } from '../components/ScoreBoard'
import { colorOf } from '../game/colors'
import { BABBLES, FORTUNES, MISSIONS, POINT_QUESTIONS, TALK_TOPICS, type Fortune } from '../game/decks'
import { draw } from '../game/shuffle'
import { clearSession, loadSession, saveSession } from '../game/storage'
import type { GameMode, Player, PlayerId, Screen, Session } from '../game/types'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

const MODE_INFO: { mode: GameMode; emoji: string; title: string; desc: string }[] = [
  { mode: 'talk', emoji: '🎤', title: 'お題トーク', desc: '赤ちゃんが選んだ人が答える' },
  { mode: 'mission', emoji: '🔥', title: 'ミッション', desc: '選ばれた人がその場でやる' },
  { mode: 'point', emoji: '👉', title: 'せーの！指さし', desc: '全員で一斉に指をさす' },
  { mode: 'fortune', emoji: '🔮', title: '赤ちゃん占い', desc: '赤ちゃんが運勢を引く' },
]

type Babble = { voice: string; meaning: string }

function IndexComponent() {
  // --- 画面状態 ---
  const [screen, setScreen] = useState<Screen>('setup')

  // --- セッション状態（保存対象） ---
  const [players, setPlayers] = useState<Player[]>([])
  const [playerCounter, setPlayerCounter] = useState(0)
  const [babyName, setBabyName] = useState('')
  const [useBaby, setUseBaby] = useState(true)
  const [round, setRound] = useState(0)

  // --- 前回の続き ---
  const [hydrated, setHydrated] = useState(false)
  const [savedSession, setSavedSession] = useState<Session | null>(null)

  // --- ゲーム進行 ---
  const [mode, setMode] = useState<GameMode | null>(null)
  const [flowAfterReveal, setFlowAfterReveal] = useState<'card' | 'mvp'>('card')
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerId | null>(null)
  const [autoPicked, setAutoPicked] = useState(false)
  const [lastPickedId, setLastPickedId] = useState<PlayerId | null>(null)
  const [mvpPlayerId, setMvpPlayerId] = useState<PlayerId | null>(null)

  // --- デッキ（シャッフルバッグ） ---
  const [talkBag, setTalkBag] = useState<string[]>([])
  const [missionBag, setMissionBag] = useState<string[]>([])
  const [pointBag, setPointBag] = useState<string[]>([])
  const [fortuneBag, setFortuneBag] = useState<Fortune[]>([])

  const [currentCardText, setCurrentCardText] = useState('')
  const [currentFortune, setCurrentFortune] = useState<Fortune | null>(null)
  const [currentPointQuestion, setCurrentPointQuestion] = useState('')
  const [babble, setBabble] = useState<Babble | null>(null)

  const [addPlayerModalOpened, setAddPlayerModalOpened] = useState(false)

  const effectiveBabyName = babyName.trim() || '赤ちゃん'
  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null
  const mvpPlayer = players.find((p) => p.id === mvpPlayerId) ?? null

  // --- SSR安全な復元: マウント後のみ localStorage を読む ---
  useEffect(() => {
    setSavedSession(loadSession())
    setHydrated(true)
  }, [])

  // --- 保存: 参加者がいる状態でのみ保存する（空データで前回の続きを上書きしないため） ---
  useEffect(() => {
    if (!hydrated) return
    if (players.length === 0) return
    saveSession({ players, babyName, useBaby, round })
  }, [hydrated, players, babyName, useBaby, round])

  // --- 参加者の追加・削除（setup画面／「あとから参加」モーダル共通） ---
  const addPlayer = (name: string) => {
    if (players.length >= 20) return
    const nextNum = playerCounter + 1
    const id: PlayerId = `p${nextNum}`
    setPlayerCounter(nextNum)
    setPlayers((prev) => {
      // 途中で削除→追加すると colorIndex が重複しうるため、既存の最大値+1を採番する
      const nextColorIndex = Math.max(-1, ...prev.map((p) => p.colorIndex)) + 1
      return [...prev, { id, name, colorIndex: nextColorIndex, score: 0 }]
    })
  }

  const removePlayer = (id: PlayerId) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  // --- 前回の続き ---
  const handleContinue = () => {
    if (!savedSession) return
    setPlayers(savedSession.players)
    setBabyName(savedSession.babyName)
    setUseBaby(savedSession.useBaby)
    setRound(savedSession.round)
    let maxNum = 0
    for (const p of savedSession.players) {
      const m = /^p(\d+)$/.exec(p.id)
      if (m) maxNum = Math.max(maxNum, Number(m[1]))
    }
    setPlayerCounter(maxNum)
    setScreen('menu')
  }

  const handleStartFresh = () => {
    clearSession()
    setSavedSession(null)
  }

  // --- 乱数抽選（イベントハンドラ内でのみ呼ぶ） ---
  const pickRandomPlayer = (): PlayerId | null => {
    if (players.length === 0) return null
    let pool = players
    if (players.length >= 3 && lastPickedId) {
      const filtered = players.filter((p) => p.id !== lastPickedId)
      if (filtered.length > 0) pool = filtered
    }
    const index = Math.floor(Math.random() * pool.length)
    return pool[index].id
  }

  const enterOracleOrAutoPick = () => {
    // 参加者が0〜1人の状態でも呼ばれうる（例: あとから参加モーダルで消しきった直後の連打）ので、
    // ここで必ず弾いておく。呼び出し元のボタンも disabled にしているが、保険として二重に守る。
    if (players.length < 2) return
    if (useBaby) {
      setScreen('oracle')
      return
    }
    const picked = pickRandomPlayer()
    if (picked) {
      setSelectedPlayerId(picked)
      setAutoPicked(true)
      setLastPickedId(picked)
    }
    setScreen('reveal')
  }

  const startOracleFlow = (nextMode: GameMode) => {
    setMode(nextMode)
    setFlowAfterReveal('card')
    enterOracleOrAutoPick()
  }

  const startMvpFlow = () => {
    setFlowAfterReveal('mvp')
    enterOracleOrAutoPick()
  }

  const handleSelectPointMode = () => {
    if (players.length < 2) return
    setMode('point')
    const { item, rest } = draw(pointBag, POINT_QUESTIONS)
    setPointBag(rest)
    setCurrentPointQuestion(item ?? POINT_QUESTIONS[0])
    setScreen('countdown')
  }

  // --- oracle画面のコールバック ---
  const handleOraclePlayerSelected = (playerId: PlayerId) => {
    setSelectedPlayerId(playerId)
    setAutoPicked(false)
    setLastPickedId(playerId)
    setScreen('reveal')
  }

  const handleOracleAutoPick = () => {
    const picked = pickRandomPlayer()
    if (picked) {
      setSelectedPlayerId(picked)
      setAutoPicked(true)
      setLastPickedId(picked)
    }
    setScreen('reveal')
  }

  // --- reveal画面の次へ ---
  const handleRevealNext = () => {
    if (flowAfterReveal === 'mvp') {
      setMvpPlayerId(selectedPlayerId)
      setScreen('award')
      return
    }
    if (mode === 'fortune') {
      const { item, rest } = draw(fortuneBag, FORTUNES)
      setFortuneBag(rest)
      setCurrentFortune(item ?? FORTUNES[0])
      setScreen('card')
      return
    }
    if (mode === 'mission') {
      const { item, rest } = draw(missionBag, MISSIONS)
      setMissionBag(rest)
      setCurrentCardText(item ?? MISSIONS[0])
      setScreen('card')
      return
    }
    // talk（デフォルト）
    const { item, rest } = draw(talkBag, TALK_TOPICS)
    setTalkBag(rest)
    setCurrentCardText(item ?? TALK_TOPICS[0])
    setScreen('card')
  }

  // --- card画面 ---
  const handlePass = () => {
    if (mode === 'mission') {
      const { item, rest } = draw(missionBag, MISSIONS)
      setMissionBag(rest)
      setCurrentCardText(item ?? MISSIONS[0])
      return
    }
    if (mode === 'fortune') {
      const { item, rest } = draw(fortuneBag, FORTUNES)
      setFortuneBag(rest)
      setCurrentFortune(item ?? FORTUNES[0])
      return
    }
    const { item, rest } = draw(talkBag, TALK_TOPICS)
    setTalkBag(rest)
    setCurrentCardText(item ?? TALK_TOPICS[0])
  }

  const handleFinishTalk = () => {
    const idx = Math.floor(Math.random() * BABBLES.length)
    setBabble(BABBLES[idx])
    setScreen('score')
  }

  const handleFortuneNext = () => {
    setRound((r) => r + 1)
    setScreen('menu')
  }

  // --- score画面 ---
  const handleScore = (delta: number) => {
    const targetId = selectedPlayerId
    setPlayers((prev) => prev.map((p) => (p.id === targetId ? { ...p, score: p.score + delta } : p)))
    setRound((r) => r + 1)
    setScreen('menu')
  }

  // --- countdown画面 ---
  const handleCountdownResult = (playerId: PlayerId | null) => {
    if (playerId) {
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, score: p.score + 1 } : p)))
    }
    setRound((r) => r + 1)
    setScreen('menu')
  }

  // --- award画面 ---
  const handlePlayAgain = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })))
    setRound(0)
    setMvpPlayerId(null)
    setScreen('menu')
  }

  const oraclePromptText =
    flowAfterReveal === 'card' && mode === 'fortune'
      ? `${effectiveBabyName}に運勢を引いてもらおう`
      : `スマホを${effectiveBabyName}の前に置いてね`

  if (screen === 'oracle') {
    return (
      <OracleScreen
        players={players}
        promptText={oraclePromptText}
        onPlayerSelected={handleOraclePlayerSelected}
        onTimeout={handleOracleAutoPick}
        onAdultPick={handleOracleAutoPick}
        onBack={() => setScreen('menu')}
      />
    )
  }

  if (screen === 'reveal' && selectedPlayer) {
    return (
      <RevealScreen
        player={selectedPlayer}
        babyName={effectiveBabyName}
        autoPicked={autoPicked}
        onNext={handleRevealNext}
      />
    )
  }

  // どの分岐にも合致しない状態（例: 参加者が0〜1人になった状態で reveal/card/score に
  // 迷い込んだ場合）を検知し、空白画面で詰まないよう最後の砦としてフォールバック画面を出す。
  const validScreenRendered =
    screen === 'setup' ||
    screen === 'menu' ||
    (screen === 'card' && Boolean(mode && selectedPlayer)) ||
    screen === 'countdown' ||
    (screen === 'score' && Boolean(selectedPlayer && babble)) ||
    screen === 'award'

  return (
    <Container size="sm" px="md" py="xl">
      {!validScreenRendered && <FallbackScreen onBackToMenu={() => setScreen('menu')} />}

      {screen === 'setup' && (
        <SetupScreen
          players={players}
          babyName={babyName}
          useBaby={useBaby}
          hydrated={hydrated}
          savedSession={savedSession}
          onBabyNameChange={setBabyName}
          onUseBabyChange={setUseBaby}
          onAdd={addPlayer}
          onRemove={removePlayer}
          onStart={() => setScreen('menu')}
          onContinue={handleContinue}
          onStartFresh={handleStartFresh}
        />
      )}

      {screen === 'menu' && (
        <MenuScreen
          players={players}
          round={round}
          onSelectMode={(m) => (m === 'point' ? handleSelectPointMode() : startOracleFlow(m))}
          addPlayerModalOpened={addPlayerModalOpened}
          onOpenAddPlayer={() => setAddPlayerModalOpened(true)}
          onCloseAddPlayer={() => setAddPlayerModalOpened(false)}
          onAdd={addPlayer}
          onRemove={removePlayer}
          onAward={() => setScreen('award')}
        />
      )}

      {screen === 'card' && mode && selectedPlayer && (
        <CardScreen
          mode={mode}
          player={selectedPlayer}
          text={currentCardText}
          fortune={currentFortune}
          onPass={handlePass}
          onFinishTalk={handleFinishTalk}
          onFortuneNext={handleFortuneNext}
        />
      )}

      {screen === 'countdown' && (
        <CountdownScreen
          question={currentPointQuestion}
          players={players}
          onResult={handleCountdownResult}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'score' && selectedPlayer && babble && (
        <ScoreScreen player={selectedPlayer} babyName={effectiveBabyName} babble={babble} onScore={handleScore} />
      )}

      {screen === 'award' && (
        <AwardScreen
          players={players}
          babyName={effectiveBabyName}
          mvpPlayer={mvpPlayer}
          onPickMvp={startMvpFlow}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={() => setScreen('menu')}
        />
      )}
    </Container>
  )
}

// ============================================================
// フォールバック — どの画面条件にも合致しなかった場合の最後の砦
// ============================================================

function FallbackScreen({ onBackToMenu }: { onBackToMenu: () => void }) {
  return (
    <Stack gap="lg" align="center" py="xl">
      <Title order={2} ta="center">
        あれ、うまく表示できませんでした
      </Title>
      <Text c="dimmed" ta="center">
        参加者が足りないか、状態が壊れてしまったようです。メニューからやり直してください。
      </Text>
      <Button size="xl" onClick={onBackToMenu}>
        メニューに戻る
      </Button>
    </Stack>
  )
}

// ============================================================
// 参加者の追加フォーム（setup画面／あとから参加モーダルで共有）
// ============================================================

function PlayerEntryForm({
  players,
  onAdd,
  onRemove,
  allowRemove,
}: {
  players: Player[]
  onAdd: (name: string) => void
  onRemove: (id: PlayerId) => void
  allowRemove: boolean
}) {
  const [name, setName] = useState('')
  const atLimit = players.length >= 20

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed || atLimit) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap" align="flex-end">
        <TextInput
          style={{ flex: 1 }}
          label="参加者を追加"
          placeholder="なまえ"
          value={name}
          maxLength={12}
          disabled={atLimit}
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleAdd()
            }
          }}
        />
        <Button size="md" onClick={handleAdd} disabled={atLimit || name.trim().length === 0}>
          追加
        </Button>
      </Group>
      {atLimit && (
        <Text size="sm" c="red">
          これ以上は入りません
        </Text>
      )}
      <Group gap="xs" wrap="wrap">
        {players.map((p) => (
          <Badge
            key={p.id}
            size="lg"
            radius="xl"
            variant="filled"
            styles={{ root: { backgroundColor: colorOf(p.colorIndex), color: '#1a1a1a' } }}
            rightSection={
              allowRemove ? (
                <ActionIcon
                  size="xs"
                  radius="xl"
                  variant="transparent"
                  color="dark"
                  aria-label={`${p.name}を削除`}
                  onClick={() => onRemove(p.id)}
                >
                  ×
                </ActionIcon>
              ) : undefined
            }
          >
            {p.name}
          </Badge>
        ))}
      </Group>
    </Stack>
  )
}

// ============================================================
// setup — 参加者登録
// ============================================================

function SetupScreen({
  players,
  babyName,
  useBaby,
  hydrated,
  savedSession,
  onBabyNameChange,
  onUseBabyChange,
  onAdd,
  onRemove,
  onStart,
  onContinue,
  onStartFresh,
}: {
  players: Player[]
  babyName: string
  useBaby: boolean
  hydrated: boolean
  savedSession: Session | null
  onBabyNameChange: (v: string) => void
  onUseBabyChange: (v: boolean) => void
  onAdd: (name: string) => void
  onRemove: (id: PlayerId) => void
  onStart: () => void
  onContinue: () => void
  onStartFresh: () => void
}) {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={1}>赤ちゃんパーティー</Title>
        <Text c="dimmed">今日の主役は、いちばん小さい人</Text>
      </Stack>

      {hydrated && savedSession && savedSession.players.length > 0 && (
        <Paper withBorder radius="lg" p="md">
          <Stack gap="xs">
            <Text size="sm">
              前回の続きから（{savedSession.players.length}人・{savedSession.round}ラウンド終了時点）
            </Text>
            <Group gap="xs">
              <Button size="sm" variant="light" onClick={onContinue}>
                続きから
              </Button>
              <Button size="sm" variant="subtle" color="gray" onClick={onStartFresh}>
                最初から
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      <Paper withBorder radius="lg" p="md">
        <PlayerEntryForm players={players} onAdd={onAdd} onRemove={onRemove} allowRemove />
      </Paper>

      <TextInput
        label="赤ちゃんの名前（任意）"
        placeholder="赤ちゃん"
        value={babyName}
        maxLength={12}
        onChange={(event) => onBabyNameChange(event.currentTarget.value)}
      />

      <Paper withBorder radius="lg" p="md">
        <Switch
          size="lg"
          checked={useBaby}
          onChange={(event) => onUseBabyChange(event.currentTarget.checked)}
          label="赤ちゃんに選んでもらう"
        />
        {!useBaby && (
          <Text size="xs" c="dimmed" mt={6}>
            （寝ちゃった時はOFFに。アプリが自動で選びます）
          </Text>
        )}
      </Paper>

      <Button size="xl" disabled={players.length < 2} onClick={onStart}>
        はじめる
      </Button>
    </Stack>
  )
}

// ============================================================
// menu — モード選択
// ============================================================

function MenuScreen({
  players,
  round,
  onSelectMode,
  addPlayerModalOpened,
  onOpenAddPlayer,
  onCloseAddPlayer,
  onAdd,
  onRemove,
  onAward,
}: {
  players: Player[]
  round: number
  onSelectMode: (mode: GameMode) => void
  addPlayerModalOpened: boolean
  onOpenAddPlayer: () => void
  onCloseAddPlayer: () => void
  onAdd: (name: string) => void
  onRemove: (id: PlayerId) => void
  onAward: () => void
}) {
  return (
    <Stack gap="lg">
      <Title order={2}>ラウンド {round + 1}</Title>

      <ScoreBoard players={players} />

      {players.length < 2 && (
        <Text size="sm" c="yellow.4" ta="center">
          参加者が2人未満です。「＋ あとから参加」で追加してください
        </Text>
      )}

      <SimpleGrid cols={2} spacing="sm">
        {MODE_INFO.map((info) => (
          <Card
            key={info.mode}
            withBorder
            radius="lg"
            p="lg"
            component="button"
            disabled={players.length < 2}
            onClick={() => onSelectMode(info.mode)}
            style={{
              cursor: players.length < 2 ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              minHeight: 140,
              opacity: players.length < 2 ? 0.5 : 1,
            }}
          >
            <Stack gap={6}>
              <Text style={{ fontSize: '2.2rem' }}>{info.emoji}</Text>
              <Text fw={700} size="lg">
                {info.title}
              </Text>
              <Text size="xs" c="dimmed">
                {info.desc}
              </Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      <Stack gap="xs" mt="md">
        <Button variant="light" size="md" onClick={onOpenAddPlayer}>
          ＋ あとから参加
        </Button>
        <Button variant="light" size="md" color="grape" onClick={onAward}>
          おひらき（表彰式へ）
        </Button>
        <Text component={Link} to="/rules" size="sm" c="dimmed" ta="center" style={{ textDecoration: 'underline' }}>
          遊び方
        </Text>
      </Stack>

      <Modal opened={addPlayerModalOpened} onClose={onCloseAddPlayer} title="あとから参加" centered>
        <PlayerEntryForm players={players} onAdd={onAdd} onRemove={onRemove} allowRemove={false} />
      </Modal>
    </Stack>
  )
}

// ============================================================
// card — お題/ミッション/占いの表示
// ============================================================

function CardScreen({
  mode,
  player,
  text,
  fortune,
  onPass,
  onFinishTalk,
  onFortuneNext,
}: {
  mode: GameMode
  player: Player
  text: string
  fortune: Fortune | null
  onPass: () => void
  onFinishTalk: () => void
  onFortuneNext: () => void
}) {
  const heading = mode === 'talk' ? 'お題トーク' : mode === 'mission' ? 'ミッション' : '赤ちゃん占い'

  return (
    <Stack gap="lg" justify="center" className="float-up" style={{ minHeight: '100dvh' }}>
      <Paper withBorder radius="lg" p="xl">
        <Stack gap="md" align="center">
          <Text fw={700} c={colorOf(player.colorIndex)} size="sm">
            {player.name}
          </Text>
          <Text size="sm" c="dimmed">
            {heading}
          </Text>

          {mode === 'fortune' && fortune ? (
            <Stack gap="sm" align="center">
              <Text fw={900} ta="center" style={{ fontSize: 'clamp(2rem, 10vw, 3.5rem)', lineHeight: 1.1 }}>
                {fortune.rank}
              </Text>
              <Text ta="center" style={{ fontSize: 'clamp(1.1rem, 5vw, 1.5rem)' }}>
                {fortune.message}
              </Text>
              <Alert color="grape" title="今日のラッキーアクション" radius="lg" w="100%">
                {fortune.action}
              </Alert>
            </Stack>
          ) : (
            <Text fw={700} ta="center" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.6rem)', lineHeight: 1.3 }}>
              {text}
            </Text>
          )}
        </Stack>
      </Paper>

      {mode === 'fortune' ? (
        <Button size="xl" onClick={onFortuneNext}>
          次へ
        </Button>
      ) : (
        <Button size="xl" onClick={onFinishTalk}>
          話し終わった！
        </Button>
      )}
      <Button size="md" variant="subtle" onClick={onPass}>
        パス（別のお題）
      </Button>
    </Stack>
  )
}

// ============================================================
// countdown — せーの！指さし
// ============================================================

type CountdownPhase = 'idle' | 'counting' | 'go'

function CountdownScreen({
  question,
  players,
  onResult,
  onBack,
}: {
  question: string
  players: Player[]
  onResult: (playerId: PlayerId | null) => void
  onBack: () => void
}) {
  const [phase, setPhase] = useState<CountdownPhase>('idle')
  const [count, setCount] = useState(3)

  // カウントダウン: 1秒ごとに減算するだけの純粋な更新にする（setState updater 内で
  // 別の state を更新しない）。0に達したフェーズ遷移は別の effect で行う。
  useEffect(() => {
    if (phase !== 'counting') return
    const id = setInterval(() => {
      setCount((c) => c - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'counting' && count <= 0) {
      setPhase('go')
    }
  }, [phase, count])

  const handleStart = () => {
    setCount(3)
    setPhase('counting')
  }

  return (
    <Stack gap="lg" align="center" justify="center" style={{ minHeight: '100dvh' }}>
      <UnstyledButton onClick={onBack} style={{ opacity: 0.4, alignSelf: 'flex-start' }}>
        <Text size="xs">← もどる</Text>
      </UnstyledButton>

      <Text fw={700} ta="center" style={{ fontSize: 'clamp(1.4rem, 6vw, 2.2rem)', lineHeight: 1.3 }}>
        {question}
      </Text>

      {phase === 'idle' && (
        <>
          <Text c="dimmed" ta="center">
            せーの、で一斉に指をさす！
          </Text>
          <Button size="xl" onClick={handleStart}>
            カウントダウン開始
          </Button>
        </>
      )}

      {phase === 'counting' && count > 0 && (
        <Text fw={900} className="pop-in" style={{ fontSize: 'clamp(4rem, 30vw, 10rem)' }}>
          {count}
        </Text>
      )}

      {phase === 'go' && (
        <Stack gap="lg" align="center" w="100%">
          <Text fw={900} className="pop-in" c="grape" style={{ fontSize: 'clamp(3rem, 20vw, 7rem)' }}>
            せーの！
          </Text>
          <Text size="sm" c="dimmed">
            一番指をさされた人は？
          </Text>
          <SimpleGrid cols={2} spacing="sm" w="100%">
            {players.map((p) => (
              <Button
                key={p.id}
                size="lg"
                variant="filled"
                styles={{ root: { backgroundColor: colorOf(p.colorIndex), color: '#1a1a1a' } }}
                onClick={() => onResult(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </SimpleGrid>
          <Button size="md" variant="subtle" color="gray" onClick={() => onResult(null)}>
            引き分け／なし
          </Button>
        </Stack>
      )}
    </Stack>
  )
}

// ============================================================
// score — 採点
// ============================================================

function ScoreScreen({
  player,
  babyName,
  babble,
  onScore,
}: {
  player: Player
  babyName: string
  babble: Babble
  onScore: (delta: number) => void
}) {
  return (
    <Stack gap="lg" justify="center" style={{ minHeight: '100dvh' }}>
      <Title order={2} ta="center">
        {player.name}のトーク、どうだった？
      </Title>

      <Paper withBorder radius="lg" p="lg" style={{ borderColor: 'var(--mantine-color-grape-5)', borderWidth: 2 }}>
        <Stack gap={4} align="center">
          <Text size="xs" c="dimmed">
            {babyName}の講評
          </Text>
          <Text fw={900} ta="center" style={{ fontSize: 'clamp(1.8rem, 8vw, 3rem)', lineHeight: 1.2 }}>
            『{babble.voice}』
          </Text>
          <Text size="md" c="dimmed" ta="center">
            （＝ {babble.meaning}）
          </Text>
        </Stack>
      </Paper>

      <Stack gap="sm">
        <Button size="xl" onClick={() => onScore(3)}>
          神回 +3
        </Button>
        <Button size="xl" variant="light" onClick={() => onScore(2)}>
          よかった +2
        </Button>
        <Button size="xl" variant="light" color="gray" onClick={() => onScore(1)}>
          まあまあ +1
        </Button>
      </Stack>
    </Stack>
  )
}

// ============================================================
// award — 表彰式
// ============================================================

function AwardScreen({
  players,
  babyName,
  mvpPlayer,
  onPickMvp,
  onPlayAgain,
  onBackToMenu,
}: {
  players: Player[]
  babyName: string
  mvpPlayer: Player | null
  onPickMvp: () => void
  onPlayAgain: () => void
  onBackToMenu: () => void
}) {
  const [resetModalOpened, setResetModalOpened] = useState(false)
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <Stack gap="lg">
      <Title order={1} ta="center">
        表彰式
      </Title>

      {sorted[0] && (
        <Stack gap={4} align="center">
          <Text size="sm" c="dimmed">
            優勝
          </Text>
          <Text fw={900} ta="center" c={colorOf(sorted[0].colorIndex)} style={{ fontSize: 'clamp(2.2rem, 12vw, 4.5rem)' }}>
            🥇 {sorted[0].name}
          </Text>
        </Stack>
      )}

      <Paper withBorder radius="lg" p="md">
        <Stack gap={6}>
          {sorted.map((p, i) => (
            <Group key={p.id} justify="space-between">
              <Text fw={600}>
                {medals[i] ?? `${i + 1}位`} {p.name}
              </Text>
              <Text fw={700}>{p.score}</Text>
            </Group>
          ))}
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="md">
        <Stack gap="sm" align="center">
          <Text ta="center">さらに、{babyName}が選ぶ MVP…</Text>
          {mvpPlayer ? (
            <Text fw={900} ta="center" c={colorOf(mvpPlayer.colorIndex)} style={{ fontSize: 'clamp(1.8rem, 10vw, 3rem)' }}>
              👑 {mvpPlayer.name}
            </Text>
          ) : (
            <Button size="lg" onClick={onPickMvp} disabled={players.length < 2}>
              赤ちゃんMVPを決める
            </Button>
          )}
        </Stack>
      </Paper>

      <Stack gap="sm" mt="md">
        <Button size="xl" color="grape" onClick={() => setResetModalOpened(true)}>
          もう一回遊ぶ
        </Button>
        <Button size="md" variant="subtle" color="gray" onClick={onBackToMenu}>
          メニューに戻る
        </Button>
      </Stack>

      <Modal
        opened={resetModalOpened}
        onClose={() => setResetModalOpened(false)}
        title="スコアをリセットしますか？"
        centered
      >
        <Stack gap="md">
          <Text size="sm">全員のスコアが0に戻ります。参加者はそのまま引き継がれます。</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setResetModalOpened(false)}>
              キャンセル
            </Button>
            <Button
              color="red"
              onClick={() => {
                setResetModalOpened(false)
                onPlayAgain()
              }}
            >
              リセットする
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
