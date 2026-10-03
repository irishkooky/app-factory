import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'
import { mainRequest } from '../lib/api'
import { inlineParams } from '../lib/sql'
import type { Action, ApiBody, RequestRecord } from '../lib/types'
import { CodeBlock } from './CodeBlock'
import { DbTables } from './DbTables'
import { SqlBreakdown, SqlCode } from './SqlBreakdown'

type NodeKey = 'browser' | 'api' | 'server' | 'db'

const NODES: { key: NodeKey; icon: string; title: string; sub: string }[] = [
  { key: 'browser', icon: '🖥️', title: 'ブラウザ', sub: 'React の画面' },
  { key: 'api', icon: '📨', title: 'API', sub: 'HTTP で受け渡し' },
  { key: 'server', icon: '🐍', title: 'サーバー', sub: 'Django なら views.py' },
  { key: 'db', icon: '🗄️', title: 'データベース', sub: 'SQLite（あなた専用）' },
]

const STEP_NODES: NodeKey[] = ['browser', 'api', 'server', 'db', 'db', 'api', 'browser']
const STEP_MS = 650

export const METHOD_COLOR: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PATCH: 'yellow',
  DELETE: 'red',
}

const METHOD_MEANING: Record<string, string> = {
  GET: '「ちょうだい」（読むだけ。DB は変わらない）',
  POST: '「新しく作って / これを処理して」',
  PATCH: '「一部を書き換えて」',
  DELETE: '「消して」',
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK（成功）',
  201: 'Created（作成できた）',
  400: 'Bad Request（送った内容がおかしい）',
  404: 'Not Found（見つからない）',
  500: 'Internal Server Error（サーバー側の失敗）',
}

function statusColor(status: number) {
  if (status >= 200 && status < 300) return 'teal'
  if (status >= 400 && status < 500) return 'orange'
  return 'red'
}

function fetchCode(r: RequestRecord): string {
  if (r.method === 'GET') return `await fetch("${r.url}")`
  const body = r.body === undefined ? '' : `,\n  body: JSON.stringify(${JSON.stringify(r.body)})`
  return `await fetch("${r.url}", {\n  method: "${r.method}"${body}\n})`
}

/** 値を 1 行の JSON にする。長い配列は途中で切る */
function inline(v: unknown): string {
  if (Array.isArray(v) && v.length > 8) return `[${v.slice(0, 8).map((x) => JSON.stringify(x)).join(',')},…ほか ${v.length - 8} 件]`
  return JSON.stringify(v)
}

/** レスポンスの JSON（学習用の debug 欄は除く）。配列は 1 要素 1 行にして読みやすくする */
function responseJson(res: ApiBody<unknown>): string {
  const pretty = (v: unknown, pad: string): string => {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
      const items = v.slice(0, 12).map((x) => `${pad}  ${JSON.stringify(x)}`)
      if (v.length > 12) items.push(`${pad}  …ほか ${v.length - 12} 件`)
      return `[\n${items.join(',\n')}\n${pad}]`
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const entries = Object.entries(v).map(([k, x]) => `${pad}  ${JSON.stringify(k)}: ${pretty(x, `${pad}  `)}`)
      return `{\n${entries.join(',\n')}\n${pad}}`
    }
    return inline(v)
  }
  const shown: Record<string, unknown> = {}
  if (res.data !== undefined) shown.data = res.data
  if (res.error !== undefined) shown.error = res.error
  return pretty(shown, '')
}

const FOLLOWUP_NOTE: Record<string, string> = {
  '/api/tasks': '最新の一覧を取り直す',
  '/api/categories': 'カテゴリの名前も取ってくる',
  '/api/schema': '設計図も取り直す',
}

function ArchFlow({ active, done }: { active: NodeKey | null; done: boolean }) {
  return (
    <SimpleGrid cols={{ base: 2, xs: 4 }} spacing={8}>
      {NODES.map((n, i) => {
        const on = active === n.key
        return (
          <Paper
            key={n.key}
            p={8}
            withBorder
            radius="md"
            style={{
              position: 'relative',
              textAlign: 'center',
              transition: 'all 250ms',
              borderColor: on ? 'var(--mantine-color-indigo-filled)' : undefined,
              borderWidth: on ? 2 : 1,
              background: on ? 'var(--mantine-color-indigo-light)' : done ? 'var(--mantine-color-teal-light)' : undefined,
              transform: on ? 'translateY(-2px)' : undefined,
            }}
          >
            <Text fz={20} lh={1.2}>
              {n.icon}
            </Text>
            <Text size="sm" fw={700}>
              {n.title}
            </Text>
            <Text size="10px" c="dimmed" lh={1.3}>
              {n.sub}
            </Text>
            {i < NODES.length - 1 && (
              <Text
                visibleFrom="xs"
                c="dimmed"
                size="xs"
                style={{ position: 'absolute', right: -9, top: '42%', zIndex: 1 }}
              >
                ⇄
              </Text>
            )}
          </Paper>
        )
      })}
    </SimpleGrid>
  )
}

function RequestPipeline({ action, request }: { action: Action; request: RequestRecord }) {
  const reduced = useReducedMotion()
  const total = STEP_NODES.length
  const [shown, setShown] = useState(total)
  const [replay, setReplay] = useState(0)

  useEffect(() => {
    if (reduced) {
      setShown(total)
      return
    }
    setShown(1)
    const t = setInterval(() => {
      setShown((n) => {
        if (n >= total) {
          clearInterval(t)
          return n
        }
        return n + 1
      })
    }, STEP_MS)
    return () => clearInterval(t)
  }, [request.id, replay, reduced, total])

  const res = request.response
  const debug = res.debug
  const queries = debug?.queries ?? []
  const main = queries.length === 1 ? queries[0] : undefined
  const failedQuery = queries.find((q) => !q.ok)
  const animating = shown < total
  const activeNode = animating ? STEP_NODES[shown - 1] : null
  const url = new URL(request.url, 'http://x')
  const queryParams = [...url.searchParams.entries()]

  const steps: { title: string; body: ReactNode }[] = [
    {
      title: '① 画面で操作した',
      body: (
        <Stack gap={6}>
          <Text size="sm" fw={600}>
            {action.label}
          </Text>
          <Text size="xs" c="dimmed">
            画面（React）が、裏でサーバーの API を呼び出します。
          </Text>
          <CodeBlock>
            {fetchCode(request)}
          </CodeBlock>
        </Stack>
      ),
    },
    {
      title: '② API にリクエストが届く',
      body: (
        <Stack gap={6}>
          <Group gap="xs">
            <Badge color={METHOD_COLOR[request.method] ?? 'gray'} radius="sm">
              {request.method}
            </Badge>
            <Code fz="sm">{request.url}</Code>
          </Group>
          <Text size="xs" c="dimmed">
            {request.method} は {METHOD_MEANING[request.method] ?? ''} という意味の HTTP メソッド。
          </Text>
          {queryParams.length > 0 && (
            <Text size="xs">
              URL の <Code fz="xs">?</Code> から後ろ（クエリ文字列）が絞り込みの条件:{' '}
              {queryParams.map(([k, v]) => (
                <Code key={k} fz="xs" mr={4}>
                  {k}={v}
                </Code>
              ))}
            </Text>
          )}
          {request.body !== undefined && (
            <>
              <Text size="xs" c="dimmed">
                送ったデータ（リクエストボディ / JSON）
              </Text>
              <CodeBlock>
                {JSON.stringify(request.body, null, 2)}
              </CodeBlock>
            </>
          )}
        </Stack>
      ),
    },
    {
      title: '③ サーバーが受け取って SQL を組み立てる',
      body: debug ? (
        <Stack gap={6}>
          <Text size="xs" c="dimmed">
            URL ごとに担当の関数（view）が決まっていて、その関数が DB への命令を作ります。Django で書くとこうなります。
          </Text>
          <CodeBlock>
            {debug.view}
          </CodeBlock>
        </Stack>
      ) : (
        <Text size="sm" c="red">
          サーバーから応答がありませんでした。
        </Text>
      ),
    },
    {
      title: '④ DB に SQL が送られる',
      body:
        queries.length === 0 ? (
          <Alert color="orange" variant="light" p="xs">
            <Text size="sm">
              SQL は送られていません。サーバーの入力チェックで止まりました。DB に届く前に、おかしなデータをはじくのもサーバーの仕事です。
            </Text>
          </Alert>
        ) : main ? (
          <Stack gap={6}>
            <Text size="xs" c="dimmed">
              Django の ORM（<Code fz="xs">Task.objects…</Code>）は、最終的にこの SQL に変換されて DB に届きます。
            </Text>
            <SqlBreakdown sql={main.sql} params={main.params} />
          </Stack>
        ) : (
          <Stack gap={6}>
            <Text size="xs" c="dimmed">
              {queries.length} 個の SQL を順番に送りました（テーブルを作って、初期データを入れる）。
            </Text>
            {queries.map((q, i) => (
              <SqlCode key={i} sql={inlineParams(q.sql, q.params)} size="xs" />
            ))}
          </Stack>
        ),
    },
    {
      title: '⑤ DB の中で起きたこと',
      body: failedQuery ? (
        <Alert color="red" variant="light" p="xs" title="DB がエラーを返しました">
          <Text size="sm" ff="monospace">
            {failedQuery.error}
          </Text>
          {res.hint && (
            <Text size="sm" mt={6}>
              💡 {res.hint}
            </Text>
          )}
        </Alert>
      ) : queries.length > 0 ? (
        <DbTables query={queries[queries.length - 1]} />
      ) : (
        <Text size="sm" c="dimmed">
          DB は何もしていません。
        </Text>
      ),
    },
    {
      title: '⑥ API がレスポンスを返す',
      body: (
        <Stack gap={6}>
          <Group gap="xs">
            <Badge color={statusColor(request.status)} radius="sm">
              {request.status || '---'}
            </Badge>
            <Text size="xs">{STATUS_TEXT[request.status] ?? ''}</Text>
          </Group>
          <Text size="xs" c="dimmed">
            DB の結果を JSON にして画面へ返します（done の 0 / 1 は true / false に直して返しています）。
          </Text>
          <CodeBlock>
            {responseJson(res)}
          </CodeBlock>
        </Stack>
      ),
    },
    {
      title: '⑦ 画面に反映',
      body: (
        <Text size="sm">
          {action.outcome ?? (res.error ? `エラーを表示: ${res.error}` : '画面を更新しました。')}
        </Text>
      ),
    },
  ]

  return (
    <Stack gap="md">
      <ArchFlow active={activeNode} done={!animating} />
      <Group justify="space-between" gap="xs">
        <Text size="xs" c="dimmed">
          {animating
            ? shown <= 4
              ? '行き: 画面 → API → サーバー → DB'
              : '帰り: DB → サーバー → API → 画面'
            : '完了。各ステップを読んでみよう'}
        </Text>
        <Group gap={6}>
          {animating && (
            <Button size="compact-xs" variant="subtle" onClick={() => setShown(total)}>
              すぐ全部見る
            </Button>
          )}
          <Button size="compact-xs" variant="light" onClick={() => setReplay((n) => n + 1)}>
            ▶ もう一度再生
          </Button>
        </Group>
      </Group>
      <Timeline active={shown - 1} bulletSize={22} lineWidth={2}>
        {steps.map((s, i) => (
          <Timeline.Item
            key={i}
            title={
              <Text fw={700} size="sm">
                {s.title}
              </Text>
            }
            style={{ opacity: i < shown ? 1 : 0.3, transition: 'opacity 300ms' }}
          >
            <Box mt={6}>{s.body}</Box>
          </Timeline.Item>
        ))}
      </Timeline>
    </Stack>
  )
}

export function Pipeline({
  actions,
  selectedId,
  onSelect,
}: {
  actions: Action[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const action = actions.find((a) => a.id === selectedId) ?? actions[0] ?? null
  const [focusId, setFocusId] = useState<string | null>(null)
  useEffect(() => setFocusId(null), [action?.id])

  const request = action
    ? (action.requests.find((r) => r.id === focusId) ?? mainRequest(action.requests))
    : undefined
  const others = action ? action.requests.filter((r) => r.id !== request?.id) : []

  return (
    <Paper withBorder radius="lg" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" gap="xs">
          <Box>
            <Title order={3} size="h4">
              裏側で起きていること
            </Title>
            <Text size="xs" c="dimmed">
              操作するたびに、データが通った道すじを順番に光らせます
            </Text>
          </Box>
          {actions.length > 1 && (
            <Select
              size="xs"
              w={260}
              label="これまでの操作を見返す"
              value={action?.id ?? null}
              onChange={(v) => v && onSelect(v)}
              data={actions.map((a, i) => ({
                value: a.id,
                label: `${actions.length - i}. ${a.label}`,
              }))}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
            />
          )}
        </Group>

        {!action || !request ? (
          <Text c="dimmed" size="sm">
            読み込み中…
          </Text>
        ) : (
          <>
            <RequestPipeline key={request.id} action={action} request={request} />
            {others.length > 0 && (
              <Box>
                <Text size="xs" fw={700} c="dimmed" mb={6}>
                  この操作では、ほかにも次のリクエストを送っています
                </Text>
                <Stack gap={6}>
                  {others.map((r) => {
                    const q = r.response.debug?.queries?.[0]
                    return (
                      <UnstyledButton
                        key={r.id}
                        onClick={() => setFocusId(r.id)}
                        style={{
                          border: '1px solid var(--mantine-color-default-border)',
                          borderRadius: 'var(--mantine-radius-md)',
                          padding: 8,
                        }}
                      >
                        <Group gap="xs" wrap="nowrap">
                          <Badge size="sm" radius="sm" color={METHOD_COLOR[r.method] ?? 'gray'}>
                            {r.method}
                          </Badge>
                          <Code fz="xs">{r.url}</Code>
                          {r.method === 'GET' && FOLLOWUP_NOTE[r.url.split('?')[0]] && (
                            <Text size="xs" c="dimmed" visibleFrom="sm">
                              {FOLLOWUP_NOTE[r.url.split('?')[0]]}
                            </Text>
                          )}
                        </Group>
                        {q && (
                          <Text size="xs" ff="monospace" mt={4} c="dimmed" lineClamp={1}>
                            {inlineParams(q.sql, q.params)}
                          </Text>
                        )}
                        <Text size="xs" c="indigo" mt={2}>
                          クリックでこのリクエストの流れを見る →
                        </Text>
                      </UnstyledButton>
                    )
                  })}
                </Stack>
              </Box>
            )}
          </>
        )}
      </Stack>
    </Paper>
  )
}
