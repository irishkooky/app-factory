import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Progress,
  RingProgress,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { questions, type Question } from '../data/questions'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

type Phase = 'start' | 'quiz' | 'result'

const QUIZ_SIZE = 10

/** 配列を Fisher-Yates でシャッフルしたコピーを返す（引数の配列は破壊しない）。 */
function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i]
    result[i] = result[j] as T
    result[j] = tmp as T
  }
  return result
}

/** 1問について choices をシャッフルし、正解の新しい位置に合わせて answerIndex を付け替えた
 * 新しい Question オブジェクトを返す（元の Question は破壊しない）。
 * 正解の文字列を保持してからシャッフル後の配列内で探すため、findIndex が -1 になることはない。
 */
function shuffleChoices(question: Question): Question {
  const correctChoice = question.choices[question.answerIndex]
  const shuffledChoices = shuffle(question.choices) as [string, string, string, string]
  const newAnswerIndex = shuffledChoices.findIndex((choice) => choice === correctChoice)
  return {
    ...question,
    choices: shuffledChoices,
    answerIndex: newAnswerIndex as 0 | 1 | 2 | 3,
  }
}

/** questions を Fisher-Yates でシャッフルしたコピーから先頭 QUIZ_SIZE 件を選び、
 * それぞれの choices もシャッフルして返す。
 * Math.random を使うため、必ずクリックなどのイベントハンドラ内で呼ぶこと
 * （レンダー中に呼ぶと SSR とクライアントで結果が食い違いハイドレーション不一致になる）。
 */
function pickQuestions(): Question[] {
  return shuffle(questions)
    .slice(0, QUIZ_SIZE)
    .map(shuffleChoices)
}

type ScoreBand = {
  title: string
  color: string
  description: string
}

function getScoreBand(score: number): ScoreBand {
  if (score <= 2) {
    return {
      title: 'AIネイティブ',
      color: 'teal',
      description: '旧世代スキルにほぼ染まっていない、生まれながらのAI世代。それで何も困りません。',
    }
  }
  if (score <= 5) {
    return {
      title: 'ハイブリッド型',
      color: 'blue',
      description: '必要な分だけ古スキルを残した、いいとこ取りの世代。バランス感覚が光ります。',
    }
  }
  if (score <= 8) {
    return {
      title: 'ベテランの遺伝子',
      color: 'grape',
      description: '体に染み付いた手作業の記憶。AIがどれだけ進化しても、つい手が動いてしまうタイプ。',
    }
  }
  return {
    title: '生きる化石エンジニア',
    color: 'orange',
    description: 'おめでとうございます、あなたは天然記念物級。その知識、博物館級の価値です。大切に語り継いでください。',
  }
}

function HomeComponent() {
  const [phase, setPhase] = useState<Phase>('start')
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])

  function handleStart() {
    setQuizQuestions(pickQuestions())
    setCurrentIndex(0)
    setSelectedIndex(null)
    setAnswers([])
    setPhase('quiz')
  }

  function handleRestart() {
    setQuizQuestions(pickQuestions())
    setCurrentIndex(0)
    setSelectedIndex(null)
    setAnswers([])
    setPhase('quiz')
  }

  function handleSelect(idx: number, q: Question) {
    // 回答確定後の連打では二重に answers を push しない
    if (selectedIndex !== null) return
    setSelectedIndex(idx)
    setAnswers((prev) => [...prev, idx === q.answerIndex])
  }

  function handleNext() {
    // 回答済み（selectedIndex !== null）のときしか呼ばれない設計。
    // currentIndex の更新経路はここに集約する。
    if (currentIndex + 1 >= quizQuestions.length) {
      setPhase('result')
      return
    }
    setCurrentIndex((prev) => prev + 1)
    setSelectedIndex(null)
  }

  if (phase === 'start') {
    return (
      <Container size="sm" py="xl">
        <Stack gap="lg">
          <Title order={1}>
            AI時代にはもう要らない？
            <br />
            エンジニアスキルクイズ
          </Title>
          <Text c="dimmed">
            正規表現、vim、CSSハック、文字コード……。AIに聞けば一瞬で済むようになった"懐かしのスキル"、あなたはどれだけ覚えていますか？
            全10問・4択。高得点なほど、あなたは……。
          </Text>

          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Title order={3}>ルール</Title>
              <Text size="sm">全16問からランダムに10問を出題</Text>
              <Text size="sm">各問4択、直感で選んでOK</Text>
              <Text size="sm">回答すると即座に解説が表示されます</Text>
              <Text size="sm">高得点なほど「化石度」が高くなります</Text>
            </Stack>
          </Card>

          <Button size="lg" onClick={handleStart}>
            挑戦する
          </Button>
        </Stack>
      </Container>
    )
  }

  if (phase === 'quiz') {
    const q = quizQuestions[currentIndex]
    if (!q) return null

    const isAnswered = selectedIndex !== null
    const isLastQuestion = currentIndex + 1 >= quizQuestions.length
    const isCorrect = isAnswered && selectedIndex === q.answerIndex
    const progressValue = ((currentIndex + (isAnswered ? 1 : 0)) / quizQuestions.length) * 100

    return (
      <Container size="sm" py="xl">
        <Stack gap="lg">
          <Stack gap="xs">
            <Group justify="space-between">
              <Badge>{q.category}</Badge>
              <Text size="sm" c="dimmed">
                第{currentIndex + 1}問 / 全{quizQuestions.length}問
              </Text>
            </Group>
            <Progress value={progressValue} />
          </Stack>

          <Card withBorder radius="md" padding="lg">
            <Title order={3}>{q.question}</Title>
          </Card>

          <Stack gap="sm">
            {q.choices.map((choice, idx) => {
              let variant: 'default' | 'filled' = 'default'
              let color: string | undefined
              if (isAnswered) {
                if (idx === q.answerIndex) {
                  variant = 'filled'
                  color = 'teal'
                } else if (idx === selectedIndex) {
                  variant = 'filled'
                  color = 'red'
                }
              }
              return (
                <Button
                  key={idx}
                  fullWidth
                  justify="flex-start"
                  size="md"
                  variant={variant}
                  color={color}
                  onClick={() => handleSelect(idx, q)}
                  disabled={isAnswered}
                >
                  {choice}
                </Button>
              )
            })}
          </Stack>

          {isAnswered && (
            <Alert
              color={isCorrect ? 'teal' : 'red'}
              title={isCorrect ? '正解！🎉' : `不正解… 正解は「${q.choices[q.answerIndex]}」`}
            >
              {q.explanation}
            </Alert>
          )}

          {isAnswered && (
            <Button size="md" onClick={handleNext}>
              {isLastQuestion ? '結果を見る' : '次の問題へ'}
            </Button>
          )}
        </Stack>
      </Container>
    )
  }

  // phase === 'result'
  const score = answers.filter(Boolean).length
  const band = getScoreBand(score)

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg" align="center">
        <RingProgress
          size={180}
          thickness={16}
          sections={[{ value: score * 10, color: band.color }]}
          label={
            <Text size="xl" fw={700} ta="center">
              {score}/10
            </Text>
          }
        />

        <Stack gap="xs" align="center">
          <Title order={2} c={band.color}>
            {band.title}
          </Title>
          <Text c="dimmed" ta="center">
            {band.description}
          </Text>
        </Stack>

        <Card withBorder radius="md" padding="lg" w="100%">
          <Stack gap="sm">
            <Title order={4}>振り返り</Title>
            <Table>
              <Table.Tbody>
                {quizQuestions.map((q, idx) => {
                  const correct = answers[idx] ?? false
                  return (
                    <Table.Tr key={q.id}>
                      <Table.Td w={32}>{correct ? '⭕' : '❌'}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{q.question}</Text>
                        <Text size="xs" c="dimmed">
                          正解: {q.choices[q.answerIndex]}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>

        <Button size="lg" onClick={handleRestart}>
          もう一度挑戦する
        </Button>
      </Stack>
    </Container>
  )
}
