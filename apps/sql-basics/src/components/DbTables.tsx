import type { CSSProperties, ReactNode } from 'react'
import { Badge, Box, Group, Stack, Table, Text, Tooltip } from '@mantine/core'
import { referencedTables, splitClauses } from '../lib/sql'
import type { ExecResult, SqlCell, TableChanges, TableSnapshot } from '../lib/types'

/** このアプリの列の意味（表の見出しに添える） */
const COLUMN_HINTS: Record<string, string> = {
  id: '背番号',
  done: '0=未完了 1=完了',
  priority: '1低 2中 3高',
  category_id: '→ categories.id',
}

export function Cell({ value }: { value: SqlCell | undefined }) {
  if (value === null || value === undefined) {
    return (
      <Text span inherit c="dimmed" fs="italic">
        NULL
      </Text>
    )
  }
  return <>{String(value)}</>
}

type RowState = 'matched' | 'inserted' | 'updated' | 'deleted' | 'dim' | 'normal'

const ROW_STYLE: Record<RowState, CSSProperties> = {
  matched: { background: 'var(--mantine-color-blue-light)' },
  inserted: { background: 'var(--mantine-color-green-light)' },
  updated: { background: 'var(--mantine-color-yellow-light)' },
  deleted: { background: 'var(--mantine-color-red-light)', textDecoration: 'line-through' },
  dim: { opacity: 0.4 },
  normal: {},
}

const LEGEND: Record<Exclude<RowState, 'dim' | 'normal'>, { color: string; label: string }> = {
  matched: { color: 'blue', label: '選ばれた行' },
  inserted: { color: 'green', label: '追加された行' },
  updated: { color: 'yellow', label: '書き換わった行' },
  deleted: { color: 'red', label: '消えた行' },
}

type DisplayRow = { rowid: number | null; cells: SqlCell[]; state: RowState; mark: ReactNode; before?: SqlCell[]; changed?: string[] }

function buildRows(
  t: TableSnapshot,
  ch: TableChanges | undefined,
  matched: number[] | undefined,
  kind: ExecResult['kind'],
  numbered: boolean,
): DisplayRow[] {
  const rows: DisplayRow[] = t.rows.map((cells, i) => {
    const rowid = t.rowids?.[i] ?? null
    const upd = ch?.updated.find((u) => u.rowid === rowid)
    if (rowid !== null && ch?.inserted.includes(rowid)) return { rowid, cells, state: 'inserted', mark: '＋' }
    if (upd) return { rowid, cells, state: 'updated', mark: '✎', before: upd.before, changed: upd.cols }
    if (matched && rowid !== null) {
      const pos = matched.indexOf(rowid)
      if (pos >= 0) {
        return {
          rowid,
          cells,
          state: 'matched',
          mark: numbered ? (
            <Badge size="xs" circle variant="filled">
              {pos + 1}
            </Badge>
          ) : (
            '✓'
          ),
        }
      }
      return { rowid, cells, state: 'dim', mark: '' }
    }
    return { rowid, cells, state: kind === 'insert' && ch ? 'dim' : 'normal', mark: '' }
  })
  for (const d of ch?.deleted ?? []) {
    const at = rows.findIndex((r) => r.rowid !== null && r.rowid > d.rowid)
    const row: DisplayRow = { rowid: d.rowid, cells: d.row, state: 'deleted', mark: '－' }
    if (at === -1) rows.push(row)
    else rows.splice(at, 0, row)
  }
  return rows
}

function SnapshotTable({ query, table }: { query: ExecResult; table: TableSnapshot }) {
  const ch = query.changes[table.name]
  const matched = query.matched[table.name]
  const singleTable = Object.keys(query.matched).length === 1
  const numbered = query.kind === 'select' && singleTable
  const rows = buildRows(table, ch, matched, query.kind, numbered)
  const states = new Set(rows.map((r) => r.state))

  return (
    <Stack gap={6}>
      <Group justify="space-between" gap="xs">
        <Group gap={6}>
          <Text fw={700} size="sm" ff="monospace">
            {table.name}
          </Text>
          <Text size="xs" c="dimmed">
            テーブル（全 {table.total} 行）
          </Text>
        </Group>
        <Group gap={4}>
          {(Object.keys(LEGEND) as (keyof typeof LEGEND)[])
            .filter((k) => states.has(k))
            .map((k) => (
              <Badge key={k} size="xs" color={LEGEND[k].color} variant="light" tt="none">
                {k === 'matched' && query.kind !== 'select' ? '対象になった行' : LEGEND[k].label}
              </Badge>
            ))}
        </Group>
      </Group>
      <Table.ScrollContainer minWidth={Math.max(320, table.columns.length * 96)} type="native">
        <Table withTableBorder withColumnBorders fz="xs" verticalSpacing={4} horizontalSpacing={8}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={36} ta="center">
                {numbered ? (
                  <Tooltip label="結果に入った順番" withArrow>
                    <span>順</span>
                  </Tooltip>
                ) : (
                  ''
                )}
              </Table.Th>
              {table.columns.map((c) => (
                <Table.Th key={c}>
                  <Text span inherit ff="monospace">
                    {c}
                  </Text>
                  {COLUMN_HINTS[c] && (
                    <Text size="10px" c="dimmed" fw={400} lh={1.2}>
                      {COLUMN_HINTS[c]}
                    </Text>
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => (
              <Table.Tr key={`${r.rowid ?? 'x'}-${i}`} style={{ ...ROW_STYLE[r.state], transition: 'all 300ms' }}>
                <Table.Td ta="center">{r.mark}</Table.Td>
                {r.cells.map((v, k) => {
                  const col = table.columns[k]
                  const changed = r.changed?.includes(col)
                  return (
                    <Table.Td key={k} fw={changed ? 700 : undefined} style={{ whiteSpace: 'nowrap' }}>
                      {changed && r.before ? (
                        <>
                          <Text span inherit c="dimmed" td="line-through" fw={400}>
                            <Cell value={r.before[k]} />
                          </Text>
                          {' → '}
                          <Cell value={v} />
                        </>
                      ) : (
                        <Cell value={v} />
                      )}
                    </Table.Td>
                  )
                })}
              </Table.Tr>
            ))}
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={table.columns.length + 1} ta="center" c="dimmed">
                  （行がありません）
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {table.total > table.rows.length && (
        <Text size="xs" c="dimmed">
          先頭 {table.rows.length} 行だけ表示しています。
        </Text>
      )}
    </Stack>
  )
}

function summary(q: ExecResult, shown: TableSnapshot[]): string[] {
  const out: string[] = []
  for (const name of q.createdTables) out.push(`テーブル ${name} ができました。`)
  for (const name of q.droppedTables) out.push(`テーブル ${name} が中身ごと消えました。`)
  for (const t of shown) {
    const ch = q.changes[t.name]
    const m = q.matched[t.name]
    if (q.kind === 'select' && m) {
      out.push(`${t.name} の全 ${t.total} 行のうち、${m.length} 行が選ばれました。`)
    } else if (ch) {
      if (ch.inserted.length) out.push(`${t.name} に ${ch.inserted.length} 行が追加されました。`)
      if (ch.updated.length) {
        const target = m?.length ?? ch.updated.length
        out.push(
          target > ch.updated.length
            ? `${t.name} の対象 ${target} 行のうち、値が変わったのは ${ch.updated.length} 行です（もともと同じ値だった行は変化なし）。`
            : `${t.name} の ${ch.updated.length} 行が書き換わりました。`,
        )
      }
      if (ch.deleted.length) out.push(`${t.name} から ${ch.deleted.length} 行が消えました。`)
    } else if ((q.kind === 'update' || q.kind === 'delete') && m) {
      out.push(m.length === 0 ? `${t.name} に WHERE の条件に合う行がなく、何も変わりませんでした。` : `${t.name} の ${m.length} 行が対象でしたが、値は変わりませんでした。`)
    }
  }
  return out
}

function scanNote(q: ExecResult, shown: TableSnapshot[]): string | null {
  if (q.kind !== 'select' || shown.length !== 1) return null
  const where = splitClauses(q.sql).find((c) => c.key === 'WHERE')
  if (!where) return null
  const t = shown[0]
  const m = q.matched[t.name]
  if (!m) return null
  if (/^\s*(\w+\.)?id\s*=/.test(where.body) && q.rowsRead <= Math.max(1, m.length)) {
    return `id（主キー）で探したので、DB は ${q.rowsRead} 行読むだけで済みました。主キーには索引（インデックス）があり、本の索引のように一発で探せるからです。`
  }
  if (q.rowsRead >= t.total && t.total > m.length) {
    return `条件に合うかどうかを確かめるため、DB は全 ${t.total} 行を 1 行ずつ見ています。行が何万件にもなると、ここが遅くなる原因になります。`
  }
  return null
}

/** SQL の実行で DB の中がどうなったかを表で見せる */
export function DbTables({ query }: { query: ExecResult }) {
  const tables = query.tables ?? []
  const refs = referencedTables(query.sql)
  const shown = tables.filter(
    (t) =>
      refs.includes(t.name.toLowerCase()) ||
      query.changes[t.name] ||
      query.matched[t.name] ||
      query.createdTables.includes(t.name),
  )
  const lines = summary(query, shown)
  const note = scanNote(query, shown)

  return (
    <Stack gap="sm">
      {lines.map((l, i) => (
        <Text key={i} size="sm" fw={600}>
          {l}
        </Text>
      ))}
      {note && (
        <Text size="xs" c="dimmed">
          💡 {note}
        </Text>
      )}
      {shown.length === 0 && query.droppedTables.length === 0 && (
        <Text size="sm" c="dimmed">
          {refs.includes('sqlite_master')
            ? 'sqlite_master は、DB が自分で持っている「テーブルの一覧表」です。各テーブルを作ったときの CREATE TABLE 文がそのまま入っています。'
            : 'この SQL は tasks や categories の行を読み書きしていません。'}
        </Text>
      )}
      {shown.map((t) => (
        <SnapshotTable key={t.name} query={query} table={t} />
      ))}
      <Box>
        <Tooltip
          multiline
          w={280}
          withArrow
          label="SQLite が数えている内部の値です。並べ替えや索引の読み書きも数えるので、表の行数とぴったり一致しないことがあります。"
        >
          <Text size="xs" c="dimmed" style={{ cursor: 'help' }} component="span">
            SQLite の内部カウンタ: 読んだ行 {query.rowsRead} / 書いた行 {query.rowsWritten} ⓘ
          </Text>
        </Tooltip>
      </Box>
    </Stack>
  )
}

/** SELECT の結果をそのまま表にする */
export function ResultTable({ columns, rows, truncated }: { columns: string[]; rows: SqlCell[][]; truncated?: boolean }) {
  if (columns.length === 0) return null
  return (
    <Stack gap={4}>
      <Table.ScrollContainer minWidth={Math.max(280, columns.length * 96)} type="native">
        <Table withTableBorder withColumnBorders fz="xs" verticalSpacing={4} horizontalSpacing={8} striped>
          <Table.Thead>
            <Table.Tr>
              {columns.map((c, i) => (
                <Table.Th key={i} ff="monospace">
                  {c}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => (
              <Table.Tr key={i}>
                {r.map((v, k) => (
                  <Table.Td key={k} style={{ whiteSpace: 'nowrap' }}>
                    <Cell value={v} />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={columns.length} ta="center" c="dimmed">
                  0 行（条件に合う行がありませんでした）
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {truncated && (
        <Text size="xs" c="dimmed">
          結果が多いので先頭だけ表示しています。
        </Text>
      )}
    </Stack>
  )
}
