import { Box, Code, Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { SchemaEntry } from '../lib/types'
import { SqlCode } from './SqlBreakdown'
import { CodeBlock } from './CodeBlock'

const MODELS_PY = `# models.py（Django で同じテーブルを定義すると）
from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=50)

    class Meta:
        db_table = "categories"

class Task(models.Model):
    title = models.CharField(max_length=200)
    done = models.BooleanField(default=False)
    priority = models.IntegerField(default=2)
    category = models.ForeignKey(
        Category, null=True, on_delete=models.SET_NULL
    )

    class Meta:
        db_table = "tasks"`

const MAPPING: { django: string; sql: string; meaning: string }[] = [
  {
    django: '（書かなくても自動で作られる id）',
    sql: 'id INTEGER PRIMARY KEY AUTOINCREMENT',
    meaning: '行の背番号（主キー）。1, 2, 3… と自動で増え、同じ番号は二度と使われない',
  },
  {
    django: 'title = models.CharField(max_length=200)',
    sql: 'title TEXT NOT NULL',
    meaning: '文字の列。NOT NULL は「空っぽ（NULL）禁止」',
  },
  {
    django: 'done = models.BooleanField(default=False)',
    sql: 'done INTEGER NOT NULL DEFAULT 0',
    meaning: '0 か 1。DEFAULT は値を書かなかったときに入る初期値',
  },
  {
    django: 'priority = models.IntegerField(default=2)',
    sql: 'priority INTEGER NOT NULL DEFAULT 2',
    meaning: '数字の列',
  },
  {
    django: 'category = models.ForeignKey(Category, …)',
    sql: 'category_id INTEGER REFERENCES categories (id)',
    meaning: '別のテーブルの id を指す列（外部キー）。Django は名前の後ろに _id を付けた列を作る',
  },
]

function TableBox({ name, cols, color }: { name: string; cols: { name: string; note?: string }[]; color: string }) {
  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden', minWidth: 150 }}>
      <Box px="sm" py={6} bg={`var(--mantine-color-${color}-light)`}>
        <Text fw={700} size="sm" ff="monospace">
          {name}
        </Text>
      </Box>
      <Stack gap={0} px="sm" py={6}>
        {cols.map((c) => (
          <Group key={c.name} gap={6} wrap="nowrap">
            <Text size="xs" ff="monospace">
              {c.name}
            </Text>
            {c.note && (
              <Text size="10px" c="dimmed">
                {c.note}
              </Text>
            )}
          </Group>
        ))}
      </Stack>
    </Paper>
  )
}

export function SchemaView({ entries }: { entries: SchemaEntry[] | null }) {
  return (
    <Stack gap="md">
      <Paper withBorder radius="lg" p="md">
        <Stack gap="sm">
          <Title order={3} size="h4">
            テーブルってなに？
          </Title>
          <Text size="sm">
            データベースの中には「テーブル（表）」がいくつか入っています。Excel のシートとほぼ同じで、
            <b>列（カラム）</b>が項目、<b>行（レコード）</b>が 1 件のデータです。SQL はこの表に対する命令文です。
          </Text>
          <Text size="sm">
            このラボには 2 つのテーブルがあります。tasks の <Code>category_id</Code> に入っている番号が、categories の{' '}
            <Code>id</Code> を指しています。こうして表を分けて番号でつなぐのが「リレーショナルデータベース」です。
          </Text>
          <Group gap="sm" align="center" wrap="wrap" justify="center" py="xs">
            <TableBox
              name="tasks"
              color="blue"
              cols={[
                { name: 'id', note: '主キー' },
                { name: 'title' },
                { name: 'done', note: '0 / 1' },
                { name: 'priority', note: '1〜3' },
                { name: 'category_id', note: '外部キー →' },
              ]}
            />
            <Text c="dimmed" ta="center" size="xs">
              category_id
              <br />
              ──────▶
              <br />
              id を指す
            </Text>
            <TableBox name="categories" color="grape" cols={[{ name: 'id', note: '主キー' }, { name: 'name' }]} />
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="md">
        <Stack gap="sm">
          <Title order={3} size="h4">
            設計図（CREATE TABLE）
          </Title>
          <Text size="xs" c="dimmed">
            いまあなたの DB に入っている設計図を、DB 自身に聞いて表示しています（右の「裏側」を見てね）。SQL タブでテーブルを足したり消したりすると、ここも変わります。
          </Text>
          {entries === null ? (
            <Text size="sm" c="dimmed">
              読み込み中…
            </Text>
          ) : entries.length === 0 ? (
            <Text size="sm" c="dimmed">
              テーブルがありません。「DB を初期状態に戻す」で元に戻せます。
            </Text>
          ) : (
            entries.map((e) => <SqlCode key={e.name} sql={e.sql} size="xs" />)
          )}
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="md">
        <Stack gap="sm">
          <Title order={3} size="h4">
            Django の models.py との対応
          </Title>
          <Text size="xs" c="dimmed">
            Django では models.py にクラスを書いて <Code>python manage.py migrate</Code> すると、Django が CREATE TABLE
            を作って DB に送ってくれます。中で起きているのは上の SQL と同じことです。
          </Text>
          <CodeBlock>
            {MODELS_PY}
          </CodeBlock>
          <Stack gap={8}>
            {MAPPING.map((m) => (
              <Paper key={m.sql} withBorder radius="md" p="xs">
                <Text size="xs" ff="monospace" c="dimmed">
                  {m.django}
                </Text>
                <Text size="xs" ff="monospace" fw={700} my={2}>
                  ↓ {m.sql}
                </Text>
                <Text size="xs">{m.meaning}</Text>
              </Paper>
            ))}
          </Stack>
          <Text size="xs" c="dimmed">
            ※ Django が実際に作る SQL は型の名前が少し違います（varchar(200) や bool など）。SQLite の中では文字・数字として同じように扱われます。
          </Text>
        </Stack>
      </Paper>
    </Stack>
  )
}
