import { useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Group,
  Kbd,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { LESSONS } from '../lib/lessons'
import type { RequestRecord, SqlRunData } from '../lib/types'
import { ResultTable } from './DbTables'
import { SqlCode } from './SqlBreakdown'
import { CodeBlock } from './CodeBlock'

export function Playground({
  busy,
  last,
  onRun,
}: {
  busy: boolean
  last: RequestRecord | null
  onRun: (sql: string, label: string) => void
}) {
  const [idx, setIdx] = useState(0)
  const [sql, setSql] = useState(LESSONS[0].sql)
  const lesson = LESSONS[idx]

  const choose = (i: number) => {
    setIdx(i)
    setSql(LESSONS[i].sql)
  }
  const run = (text: string) => {
    setSql(text)
    onRun(text, `レッスン${lesson.no}: SQL を実行した`)
  }

  const data = last?.response.data as SqlRunData | undefined
  const hint = last?.response.hint

  return (
    <Stack gap="md">
      <Paper withBorder radius="lg" p="md">
        <Stack gap="sm">
          <Box>
            <Title order={3} size="h4">
              SQL のきほん 10 ステップ
            </Title>
            <Text size="xs" c="dimmed">
              上から順に「実行」を押していくと、基礎の基本がひととおり触れます。ここはあなた専用の DB なので、何を消しても大丈夫。
            </Text>
          </Box>
          <SimpleGrid cols={{ base: 2, xs: 5 }} spacing={6}>
            {LESSONS.map((l, i) => (
              <UnstyledButton
                key={l.no}
                onClick={() => choose(i)}
                p={6}
                style={{
                  borderRadius: 'var(--mantine-radius-md)',
                  border: `1px solid ${i === idx ? 'var(--mantine-color-indigo-filled)' : 'var(--mantine-color-default-border)'}`,
                  background: i === idx ? 'var(--mantine-color-indigo-light)' : undefined,
                }}
              >
                <Text size="10px" c="dimmed">
                  STEP {l.no}
                </Text>
                <Text size="xs" fw={700} truncate>
                  {l.short}
                </Text>
              </UnstyledButton>
            ))}
          </SimpleGrid>

          <Paper radius="md" p="sm" bg="var(--mantine-color-default-hover)">
            <Stack gap={8}>
              <Text fw={700}>{lesson.title}</Text>
              <Text size="sm">{lesson.body}</Text>
              <SqlCode sql={lesson.sql} />
              <Group gap="xs">
                <Button size="xs" onClick={() => run(lesson.sql)} loading={busy}>
                  この SQL を実行
                </Button>
                {lesson.more?.map((m) => (
                  <Button key={m.label} size="xs" variant="default" onClick={() => run(m.sql)} disabled={busy}>
                    {m.label}
                  </Button>
                ))}
              </Group>
              <Box>
                <Text size="xs" fw={700} c="dimmed" mb={2}>
                  Django の ORM で書くと
                </Text>
                <CodeBlock>
                  {lesson.django}
                </CodeBlock>
              </Box>
              <Text size="xs">💡 {lesson.point}</Text>
              <Group justify="space-between">
                <Button size="compact-xs" variant="subtle" disabled={idx === 0} onClick={() => choose(idx - 1)}>
                  ← 前へ
                </Button>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  disabled={idx === LESSONS.length - 1}
                  onClick={() => choose(idx + 1)}
                >
                  次へ →
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="md">
        <Stack gap="sm">
          <Group justify="space-between" gap="xs">
            <Title order={3} size="h4">
              自由に書いてみる
            </Title>
            <Group gap={4}>
              <Badge variant="light" tt="none" ff="monospace">
                tasks
              </Badge>
              <Badge variant="light" tt="none" ff="monospace" color="grape">
                categories
              </Badge>
            </Group>
          </Group>
          <Textarea
            value={sql}
            onChange={(e) => setSql(e.currentTarget.value)}
            autosize
            minRows={3}
            maxRows={10}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="SQL 入力欄"
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 } }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                onRun(sql, 'SQL を自分で書いて実行した')
              }
            }}
          />
          <Group justify="space-between" gap="xs">
            <Text size="xs" c="dimmed">
              <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">Enter</Kbd> でも実行できます。1 回に 1 文ずつ。
            </Text>
            <Button size="xs" onClick={() => onRun(sql, 'SQL を自分で書いて実行した')} loading={busy}>
              実行
            </Button>
          </Group>

          {last && (
            <Box>
              <Text size="xs" fw={700} c="dimmed" mb={4}>
                結果
              </Text>
              {last.response.error ? (
                <Alert color="red" variant="light" p="xs" title="エラー">
                  <Text size="sm" ff="monospace">
                    {last.response.error}
                  </Text>
                  {hint && (
                    <Text size="sm" mt={6}>
                      💡 {hint}
                    </Text>
                  )}
                </Alert>
              ) : data && data.columns.length > 0 ? (
                <ResultTable columns={data.columns} rows={data.rows} truncated={data.truncated} />
              ) : (
                <Text size="sm">実行しました。どの行がどう変わったかは「裏側」の ⑤ で見られます。</Text>
              )}
            </Box>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
