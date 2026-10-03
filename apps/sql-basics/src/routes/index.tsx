import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Affix,
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core'
import { useInViewport, useMediaQuery } from '@mantine/hooks'
import { Pipeline } from '../components/Pipeline'
import { Playground } from '../components/Playground'
import { SchemaView } from '../components/SchemaView'
import { DEFAULT_FILTERS, TodoApp, filtersToQuery, type Filters } from '../components/TodoApp'
import { callApi, mainRequest } from '../lib/api'
import { inlineParams, statementKind } from '../lib/sql'
import type { Action, Category, RequestRecord, SchemaEntry, SqlRunData, Task } from '../lib/types'

export const Route = createFileRoute('/')({
  component: Home,
})

type Call = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
  role?: RequestRecord['role'],
) => Promise<RequestRecord>

let actionSeq = 0

function Home() {
  const [tab, setTab] = useState('app')
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [actions, setActions] = useState<Action[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [schema, setSchema] = useState<SchemaEntry[] | null>(null)
  const [lastSql, setLastSql] = useState<RequestRecord | null>(null)
  // SQL タブで DB を書き換えたら、アプリ画面と設計図を取り直す必要がある
  const stale = useRef({ app: false, schema: true })
  const started = useRef(false)
  const pipelineRef = useRef<HTMLDivElement>(null)
  const { ref: inViewRef, inViewport } = useInViewport()
  const narrow = useMediaQuery('(max-width: 61.99em)')

  const perform = useCallback(
    async (label: string, source: Action['source'], fn: (call: Call) => Promise<string | undefined>) => {
      setBusy(true)
      const requests: RequestRecord[] = []
      const call: Call = async (method, url, body, role = 'main') => {
        const r = await callApi(method, url, body, role)
        requests.push(r)
        return r
      }
      let outcome: string | undefined
      try {
        outcome = await fn(call)
      } catch (e) {
        outcome = `エラー: ${e instanceof Error ? e.message : String(e)}`
      } finally {
        setBusy(false)
      }
      const action: Action = { id: `a${++actionSeq}`, label, source, at: Date.now(), requests, outcome }
      setActions((prev) => [action, ...prev].slice(0, 40))
      setSelectedId(action.id)
      return action
    },
    [],
  )

  const loadTasks = async (call: Call, f: Filters, role: RequestRecord['role']) => {
    const r = await call('GET', `/api/tasks${filtersToQuery(f)}`, undefined, role)
    const data = r.response.data as Task[] | undefined
    if (data) {
      setTasks(data)
      return `一覧を ${data.length} 件で描き直しました。`
    }
    return `エラーを表示しました: ${r.response.error ?? r.status}`
  }

  const loadCategories = async (call: Call) => {
    const r = await call('GET', '/api/categories', undefined, 'followup')
    const data = r.response.data as Category[] | undefined
    if (data) setCategories(data)
  }

  const reloadApp = (label: string) =>
    perform(label, 'app', async (call) => {
      await loadCategories(call)
      stale.current.app = false
      return loadTasks(call, filters, 'main')
    })

  const loadSchema = () =>
    perform('「設計図」タブを開いた', 'schema', async (call) => {
      const r = await call('GET', '/api/schema')
      const data = r.response.data as SchemaEntry[] | undefined
      setSchema(data ?? [])
      stale.current.schema = false
      return data ? `${data.length} 個のテーブルの設計図を表示しました。` : `エラーを表示しました: ${r.response.error}`
    })

  useEffect(() => {
    if (started.current) return
    started.current = true
    void reloadApp('ページを開いた')
    // 最初の 1 回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeTab = (v: string | null) => {
    if (!v) return
    setTab(v)
    if (v === 'app' && stale.current.app) void reloadApp('アプリ画面に戻った（DB が変わったので一覧を取り直す）')
    if (v === 'schema' && stale.current.schema) void loadSchema()
  }

  const onFilters = (next: Filters, label: string) => {
    setFilters(next)
    void perform(label, 'app', (call) => loadTasks(call, next, 'main'))
  }

  const onAdd = async (input: { title: string; priority: number; category_id: number | null }) => {
    const action = await perform(`「${input.title.trim() || '（空）'}」を追加しようとした`, 'app', async (call) => {
      const r = await call('POST', '/api/tasks', input)
      if (r.response.error) return `エラーを表示しました: ${r.response.error}`
      await loadTasks(call, filters, 'followup')
      stale.current.schema = true
      return `追加できたので、一覧を取り直して「${input.title.trim()}」を表示しました。`
    })
    const main = mainRequest(action.requests)
    return !!main && main.status >= 200 && main.status < 300
  }

  const onToggle = (t: Task) =>
    void perform(`「${t.title}」を${t.done ? '未完了に戻した' : '完了にした'}`, 'app', async (call) => {
      const r = await call('PATCH', `/api/tasks/${t.id}`, { done: !t.done })
      if (r.response.error) return `エラーを表示しました: ${r.response.error}`
      await loadTasks(call, filters, 'followup')
      return `書き換えたので、一覧を取り直してチェック表示を更新しました。`
    })

  const onDelete = (t: Task) =>
    void perform(`「${t.title}」を削除した`, 'app', async (call) => {
      const r = await call('DELETE', `/api/tasks/${t.id}`)
      if (r.response.error) return `エラーを表示しました: ${r.response.error}`
      await loadTasks(call, filters, 'followup')
      return `消したので、一覧を取り直しました。「${t.title}」は表示されなくなりました。`
    })

  const onReset = () =>
    void perform('「DB を初期状態に戻す」を押した', 'system', async (call) => {
      const r = await call('POST', '/api/reset')
      if (r.response.error) return `エラーを表示しました: ${r.response.error}`
      await loadCategories(call)
      await loadTasks(call, filters, 'followup')
      setLastSql(null)
      stale.current = { app: false, schema: true }
      if (tab === 'schema') {
        const s = await call('GET', '/api/schema', undefined, 'followup')
        setSchema((s.response.data as SchemaEntry[] | undefined) ?? [])
        stale.current.schema = false
      }
      return 'テーブルを作り直して初期データを入れ、一覧を表示し直しました。'
    })

  const onRunSql = (sql: string, label: string) =>
    void perform(label, 'sql', async (call) => {
      const r = await call('POST', '/api/sql', { sql })
      setLastSql(r)
      if (r.response.error) return `エラーメッセージを表示しました: ${r.response.error}`
      if (statementKind(sql) !== 'select') stale.current = { app: true, schema: true }
      const data = r.response.data as SqlRunData | undefined
      return data && data.columns.length > 0
        ? `結果の表（${data.rows.length} 行）を表示しました。`
        : '実行できたことを表示しました。'
    })

  const latest = actions[0]
  const latestQuery = latest ? mainRequest(latest.requests)?.response.debug?.queries?.[0] : undefined

  return (
    <Container size={1400} py="lg" px={{ base: 'sm', sm: 'lg' }}>
      <Stack gap="lg">
        <Stack gap={6}>
          <Title order={1} size="h2">
            SQL の見える化ラボ
          </Title>
          <Text size="sm" maw={820}>
            アプリを操作すると、<b>画面 → API → サーバー → データベース</b> とデータが通った道すじと、そのとき実際に走った SQL を順番に光らせて見せます。
            サーバーの部分は「Django で書くとこうなる」コードを並べて表示します。
          </Text>
          <Group gap="xs" mt={4}>
            <Badge variant="light" tt="none">
              DB は SQLite（Django の初期設定と同じ）
            </Badge>
            <Badge variant="light" color="teal" tt="none">
              あなた専用の DB。壊しても大丈夫
            </Badge>
            <Button size="compact-xs" variant="light" color="red" onClick={onReset} disabled={busy}>
              DB を初期状態に戻す
            </Button>
          </Group>
        </Stack>

        <Grid gap="lg">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Tabs value={tab} onChange={changeTab} keepMounted>
              <Tabs.List grow mb="md">
                <Tabs.Tab value="app">① アプリを動かす</Tabs.Tab>
                <Tabs.Tab value="sql">② SQL を書く</Tabs.Tab>
                <Tabs.Tab value="schema">③ 設計図</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="app">
                <TodoApp
                  tasks={tasks}
                  categories={categories}
                  filters={filters}
                  busy={busy}
                  onFilters={onFilters}
                  onAdd={onAdd}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              </Tabs.Panel>
              <Tabs.Panel value="sql">
                <Playground busy={busy} last={lastSql} onRun={onRunSql} />
              </Tabs.Panel>
              <Tabs.Panel value="schema">
                <SchemaView entries={schema} />
              </Tabs.Panel>
            </Tabs>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Box ref={pipelineRef} style={{ scrollMarginTop: 12 }}>
              <Box ref={inViewRef}>
                <Pipeline actions={actions} selectedId={selectedId} onSelect={setSelectedId} />
              </Box>
            </Box>
          </Grid.Col>
        </Grid>

        <Text size="xs" c="dimmed">
          しくみの注記: このアプリのサーバーは Cloudflare Workers（TypeScript）で動いていて、Django のコードは「同じことを Django で書くと」の対応表示です。
          SQL とデータベース（SQLite）は本物で、訪問者ごとに別々の DB が用意されます（2 週間使わないと自動で片付けます）。{' '}
          <Anchor href="https://docs.djangoproject.com/ja/5.2/topics/db/queries/" target="_blank" rel="noreferrer" size="xs">
            Django のクエリの公式ドキュメント
          </Anchor>
        </Text>
      </Stack>

      {narrow && latest && !inViewport && (
        <Affix position={{ bottom: 12, left: 12, right: 12 }}>
          <Paper shadow="md" withBorder radius="md" p="xs">
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Box style={{ minWidth: 0 }}>
                <Text size="10px" c="dimmed" truncate>
                  {latest.label}
                </Text>
                <Text size="xs" ff="monospace" truncate>
                  {latestQuery ? inlineParams(latestQuery.sql, latestQuery.params) : mainRequest(latest.requests)?.url}
                </Text>
              </Box>
              <Button
                size="compact-sm"
                onClick={() => pipelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                裏側を見る ↓
              </Button>
            </Group>
          </Paper>
        </Affix>
      )}
    </Container>
  )
}
