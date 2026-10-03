import { Alert, Badge, Box, Code, Group, Stack, Text } from '@mantine/core'
import {
  clauseColor,
  explainClause,
  inlineParams,
  logicalOrder,
  missingWhere,
  splitClauses,
  statementKind,
} from '../lib/sql'
import type { SqlValue } from '../lib/types'
import { CodeBlock } from './CodeBlock'

/** 句ごとに改行・色分けした SQL */
export function SqlCode({ sql, size = 'sm' }: { sql: string; size?: 'xs' | 'sm' }) {
  const clauses = splitClauses(sql)
  return (
    <Box
      component="pre"
      m={0}
      p="sm"
      ff="monospace"
      fz={size}
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: 'var(--mantine-color-default-hover)',
        borderRadius: 'var(--mantine-radius-sm)',
        lineHeight: 1.7,
      }}
    >
      {clauses.length === 0
        ? sql
        : clauses.map((c, i) => (
            <div key={i}>
              {c.keyword && (
                <Text span inherit fw={700} c={`${clauseColor(c.key)}.7`}>
                  {c.keyword}
                </Text>
              )}
              {c.keyword && c.body ? ' ' : ''}
              {c.body}
            </div>
          ))}
    </Box>
  )
}

/** SQL を色分けし、日本語の読み方と DB の処理順を添える */
export function SqlBreakdown({ sql, params = [] }: { sql: string; params?: SqlValue[] }) {
  const readable = inlineParams(sql, params)
  const kind = statementKind(readable)
  const clauses = splitClauses(readable)
  const order = kind === 'select' ? logicalOrder(clauses) : null
  const notes = clauses
    .map((c) => ({ c, text: explainClause(c, kind) }))
    .filter((x) => x.text)

  return (
    <Stack gap="sm">
      <SqlCode sql={readable} />

      {missingWhere(readable) && (
        <Alert color="red" variant="light" p="xs" title="WHERE がありません">
          <Text size="sm">どの行かを指定していないので、テーブルの全部の行が対象になります。</Text>
        </Alert>
      )}

      {notes.length > 0 && (
        <Box>
          <Text size="xs" fw={700} c="dimmed" mb={4}>
            日本語で読むと
          </Text>
          <Stack gap={6}>
            {notes.map(({ c, text }, i) => (
              <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
                <Badge color={clauseColor(c.key)} variant="light" tt="none" radius="sm" miw={88} style={{ flexShrink: 0 }}>
                  {c.keyword}
                </Badge>
                <Text size="sm" style={{ wordBreak: 'break-word' }}>
                  {text}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
      )}

      {order && (
        <Box>
          <Text size="xs" fw={700} c="dimmed" mb={4}>
            DB が実際に考える順番（書く順番とちがう！）
          </Text>
          <Group gap={6}>
            {order.map((c, i) => (
              <Group key={i} gap={6} wrap="nowrap">
                {i > 0 && (
                  <Text size="xs" c="dimmed">
                    →
                  </Text>
                )}
                <Badge color={clauseColor(c.key)} variant="outline" tt="none" radius="sm">
                  {i + 1}. {c.keyword}
                </Badge>
              </Group>
            ))}
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            まず表（FROM）を決めて、行を絞って（WHERE）、それから列を選ぶ（SELECT）。だから SELECT でつけた別名は WHERE では使えない。
          </Text>
        </Box>
      )}

      {params.length > 0 && (
        <Box>
          <Text size="xs" fw={700} c="dimmed" mb={4}>
            実際の送り方（プレースホルダ）
          </Text>
          <CodeBlock>
            {`${sql}\n-- ? に入る値: ${JSON.stringify(params)}`}
          </CodeBlock>
          <Text size="xs" c="dimmed" mt={4}>
            上の SQL は読みやすいよう値を埋め込んで表示しています。本当は SQL と値を別々に送り、DB が ? に当てはめます。入力に ' などが混ざっても SQL が壊れない（SQL インジェクション対策）。Django の ORM も同じ仕組みです。
          </Text>
        </Box>
      )}
    </Stack>
  )
}
