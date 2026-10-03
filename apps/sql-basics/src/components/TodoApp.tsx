import { useState, type ReactNode } from 'react'
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Code,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { Category, Task } from '../lib/types'

export type Filters = {
  done: 'all' | '0' | '1'
  category: string
  q: string
  order: 'none' | 'new' | 'priority'
}

export const DEFAULT_FILTERS: Filters = { done: 'all', category: 'all', q: '', order: 'none' }

export const PRIORITY_LABEL: Record<number, string> = { 1: '低', 2: '中', 3: '高' }
const PRIORITY_COLOR: Record<number, string> = { 1: 'gray', 2: 'blue', 3: 'red' }

export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams()
  if (f.done !== 'all') p.set('done', f.done)
  if (f.category !== 'all') p.set('category', f.category)
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.order !== 'none') p.set('order', f.order)
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** 操作と SQL の対応を示す小さな札 */
function SqlTag({ children }: { children: ReactNode }) {
  return (
    <Code
      fz={11}
      c="var(--mantine-color-indigo-light-color)"
      bg="var(--mantine-color-indigo-light)"
      style={{ whiteSpace: 'nowrap' }}
    >
      {children}
    </Code>
  )
}

function Label({ text, sql }: { text: string; sql: string }) {
  return (
    <Group gap={6} mb={4}>
      <Text size="sm" fw={600}>
        {text}
      </Text>
      <SqlTag>{sql}</SqlTag>
    </Group>
  )
}

export function TodoApp({
  tasks,
  categories,
  filters,
  busy,
  onFilters,
  onAdd,
  onToggle,
  onDelete,
}: {
  tasks: Task[]
  categories: Category[]
  filters: Filters
  busy: boolean
  onFilters: (next: Filters, label: string) => void
  onAdd: (input: { title: string; priority: number; category_id: number | null }) => Promise<boolean>
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
}) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('2')
  const [category, setCategory] = useState<string | null>(null)
  const [q, setQ] = useState(filters.q)
  const catName = (id: number | null) => categories.find((c) => c.id === id)?.name

  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }))

  return (
    <Paper withBorder radius="lg" p="md">
      <Stack gap="md">
        <Box>
          <Title order={3} size="h4">
            やることリスト
          </Title>
          <Text size="xs" c="dimmed">
            ふつうの Web アプリです。ボタンを押すと、右（スマホは下）の「裏側」に、そのとき走った API と SQL が出ます。
            <SqlTag>青い札</SqlTag> は、その操作がどの SQL になるかの目印です。
          </Text>
        </Box>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const ok = await onAdd({
              title,
              priority: Number(priority),
              category_id: category ? Number(category) : null,
            })
            if (ok) setTitle('')
          }}
        >
          <Label text="追加する" sql="INSERT INTO tasks" />
          <Group gap="xs" align="flex-end" wrap="wrap">
            <TextInput
              placeholder="例: 洗剤を買う"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              style={{ flex: '1 1 160px' }}
              maxLength={60}
              aria-label="新しいやること"
            />
            <Select
              w={92}
              value={priority}
              onChange={(v) => setPriority(v ?? '2')}
              data={[
                { value: '3', label: '優先 高' },
                { value: '2', label: '優先 中' },
                { value: '1', label: '優先 低' },
              ]}
              allowDeselect={false}
              aria-label="優先度"
            />
            <Select
              w={110}
              placeholder="カテゴリ"
              value={category}
              onChange={setCategory}
              data={categoryOptions}
              clearable
              aria-label="カテゴリ"
            />
            <Button type="submit" loading={busy}>
              追加
            </Button>
          </Group>
        </form>

        <Divider label="絞り込み・並べ替え（SELECT の条件になる）" labelPosition="left" />

        <Box>
          <Label text="状態" sql="WHERE done = ?" />
          <SegmentedControl
            fullWidth
            size="xs"
            value={filters.done}
            onChange={(v) => {
              const label = v === 'all' ? 'すべて' : v === '0' ? '未完了だけ' : '完了だけ'
              onFilters({ ...filters, done: v as Filters['done'] }, `状態を「${label}」に絞り込んだ`)
            }}
            data={[
              { value: 'all', label: 'すべて' },
              { value: '0', label: '未完了' },
              { value: '1', label: '完了' },
            ]}
          />
        </Box>

        <Group grow align="flex-start" gap="sm" wrap="wrap">
          <Box style={{ minWidth: 150 }}>
            <Label text="カテゴリ" sql="WHERE category_id = ?" />
            <Select
              size="xs"
              value={filters.category}
              onChange={(v) => {
                const next = v ?? 'all'
                const name = next === 'all' ? 'すべて' : catName(Number(next))
                onFilters({ ...filters, category: next }, `カテゴリを「${name}」に絞り込んだ`)
              }}
              data={[{ value: 'all', label: 'すべて' }, ...categoryOptions]}
              allowDeselect={false}
              aria-label="カテゴリで絞り込む"
            />
          </Box>
          <Box style={{ minWidth: 150 }}>
            <Label text="並び順" sql="ORDER BY" />
            <Select
              size="xs"
              value={filters.order}
              onChange={(v) => {
                const next = (v ?? 'none') as Filters['order']
                const label = next === 'new' ? '新しい順' : next === 'priority' ? '優先度が高い順' : '指定なし'
                onFilters({ ...filters, order: next }, `並び順を「${label}」にした`)
              }}
              data={[
                { value: 'none', label: '指定なし' },
                { value: 'new', label: '新しい順' },
                { value: 'priority', label: '優先度が高い順' },
              ]}
              allowDeselect={false}
              aria-label="並び順"
            />
          </Box>
        </Group>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onFilters({ ...filters, q }, q.trim() ? `「${q.trim()}」で検索した` : '検索をクリアした')
          }}
        >
          <Label text="タイトルで検索" sql="WHERE title LIKE ?" />
          <Group gap="xs" wrap="nowrap">
            <TextInput
              size="xs"
              placeholder="例: 買う"
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              style={{ flex: 1 }}
              aria-label="タイトルで検索"
            />
            <Button size="xs" type="submit" variant="light">
              検索
            </Button>
          </Group>
        </form>

        <Divider
          label={
            <Group gap={6}>
              <Text size="xs">一覧（{tasks.length} 件）</Text>
              <SqlTag>✓ = UPDATE</SqlTag>
              <SqlTag>削除 = DELETE</SqlTag>
            </Group>
          }
          labelPosition="left"
        />

        <Stack gap={6}>
          {tasks.map((t) => (
            <Paper key={t.id} withBorder radius="md" px="sm" py={8}>
              <Group gap="sm" wrap="nowrap" justify="space-between">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Checkbox
                    checked={t.done}
                    onChange={() => onToggle(t)}
                    disabled={busy}
                    aria-label={`${t.title} を${t.done ? '未完了に戻す' : '完了にする'}`}
                  />
                  <Box style={{ minWidth: 0 }}>
                    <Text
                      size="sm"
                      td={t.done ? 'line-through' : undefined}
                      c={t.done ? 'dimmed' : undefined}
                      truncate
                    >
                      {t.title}
                    </Text>
                    <Group gap={4} mt={2}>
                      <Text size="10px" c="dimmed" ff="monospace">
                        id={t.id}
                      </Text>
                      <Badge size="xs" variant="light" color={PRIORITY_COLOR[t.priority] ?? 'gray'} tt="none">
                        優先 {PRIORITY_LABEL[t.priority] ?? t.priority}
                      </Badge>
                      {t.category_id !== null && (
                        <Badge size="xs" variant="outline" color="grape" tt="none">
                          {catName(t.category_id) ?? `カテゴリ ${t.category_id}`}
                        </Badge>
                      )}
                    </Group>
                  </Box>
                </Group>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="red"
                  onClick={() => onDelete(t)}
                  disabled={busy}
                >
                  削除
                </Button>
              </Group>
            </Paper>
          ))}
          {tasks.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              該当なし（条件に合う行が 0 件でした）
            </Text>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
