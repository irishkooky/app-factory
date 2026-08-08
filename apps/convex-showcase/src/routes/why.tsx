import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Button,
  Code,
  Container,
  Group,
  List,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'

export const Route = createFileRoute('/why')({
  component: WhyComponent,
})

const LISTEN_BY_CHANNEL_SNIPPET = `export const listByChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(50);
    // ...著者とリアクションをJOINして返す
  },
});`

const USE_QUERY_SNIPPET = `useSuspenseQuery(convexQuery(api.messages.listByChannel, { channelId }))`

const SUMMON_BOT_SNIPPET = `export const summonBot = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    // ...チャンネル・Botの存在チェック
    await ctx.scheduler.runAfter(1500, internal.bot.reply, {
      channelId: args.channelId,
      botId: bot._id,
    });
  },
});`

const SCHEMA_SNIPPET = `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  members: defineTable({
    name: v.string(),
    emoji: v.string(),
    isBot: v.boolean(),
  }),
  channels: defineTable({
    name: v.string(),
    description: v.string(),
    emoji: v.string(),
  }),
  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.id("members"),
    body: v.string(),
  }).index("by_channel", ["channelId"]),
  reactions: defineTable({
    messageId: v.id("messages"),
    memberId: v.id("members"),
    emoji: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_member_emoji", ["messageId", "memberId", "emoji"]),
});`

const JOIN_SNIPPET = `const authorDoc = await ctx.db.get(message.authorId);
const author = authorDoc ?? {
  name: "退会メンバー",
  emoji: "👻",
  isBot: false,
};

const reactionDocs = await ctx.db
  .query("reactions")
  .withIndex("by_message", (q) => q.eq("messageId", message._id))
  .collect();
// ...絵文字ごとに集計しつつ、メンバー名もctx.db.get()でJOIN`

function WhyComponent() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>なぜConvexなのか</Title>
          <Text c="dimmed">
            ConvexはDB・サーバー関数・リアルタイム購読が一体になったTypeScriptバックエンドです。このデモの実コードをもとに、2つの強みを解説します。
          </Text>
        </Stack>

        <Stack gap="md">
          <Title order={2}>強み① リアルタイム性 — 「クエリを購読する」という発想</Title>
          <Text>
            従来はデータ更新を画面に反映するために、ポーリング・手動WebSocket・キャッシュ無効化の実装が必要でした。Convexではクエリ関数が自動的に「購読」になります。mutationがDBに書き込むと、影響するクエリだけがサーバーで再実行され、新しい結果が接続中の全クライアントへWebSocketでプッシュされます。フロントは
            <Code>useQuery</Code>（このアプリでは <Code>useSuspenseQuery</Code>）を書くだけです。
          </Text>

          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>観点</Table.Th>
                <Table.Th>従来のREST＋ポーリング</Table.Th>
                <Table.Th>Convex</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>更新の検知</Table.Td>
                <Table.Td>一定間隔でリクエストして差分を確認</Table.Td>
                <Table.Td>クエリが自動的に購読になり、変更時のみ再配信</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>無駄な通信</Table.Td>
                <Table.Td>変化がなくてもリクエストが発生する</Table.Td>
                <Table.Td>変化があった時だけWebSocketでプッシュ</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>実装コード</Table.Td>
                <Table.Td>ポーリング・WebSocket・キャッシュ無効化を自前実装</Table.Td>
                <Table.Td>
                  <Code>useQuery</Code>を書くだけ
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>複数タブ・複数人の同期</Table.Td>
                <Table.Td>各クライアントで個別に整合性を作り込む必要がある</Table.Td>
                <Table.Td>サーバーが同一の購読結果を全クライアントへ配信</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>

          <Stack gap={4}>
            <Text size="sm" fw={600}>
              実コード: convex/messages.ts の listByChannel（抜粋）
            </Text>
            <Code block>{LISTEN_BY_CHANNEL_SNIPPET}</Code>
            <Text size="sm" fw={600} mt="xs">
              このクエリを使う側（src/routes/index.tsx）
            </Text>
            <Code block>{USE_QUERY_SNIPPET}</Code>
            <Text size="xs" c="dimmed">
              サーバーの関数もフロントの購読もこれで全部。socketコードは1行も書いていない
            </Text>
          </Stack>

          <Stack gap={4}>
            <Text>
              デモの「Bot召喚」は <Code>ctx.scheduler.runAfter</Code>
              でサーバー側に遅延実行を予約しています。返信が挿入された瞬間、開いている全タブに反映されます。
            </Text>
            <Code block>{SUMMON_BOT_SNIPPET}</Code>
          </Stack>
        </Stack>

        <Stack gap="md">
          <Title order={2}>
            強み② リレーショナルなドキュメントDB — NoSQLの柔軟さ × RDBの関係モデリング
          </Title>
          <Text>
            ConvexのテーブルはJSONライクなドキュメントを格納します（ドキュメントDB）。しかし{' '}
            <Code>{'v.id("テーブル名")'}</Code>{' '}
            で他テーブルへの参照（外部キー相当）を型付きで持て、インデックスを張って効率的に辿れます。JOINは特別なクエリ言語ではなく、サーバー側のTypeScriptで
            <Code>ctx.db.get()</Code>
            を呼ぶだけです。スキーマ定義から関数の戻り値、フロントのdataまで、全部TypeScriptの型が一気通貫でつながります。
          </Text>

          <Paper withBorder radius="md" p="md">
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                このアプリのテーブル関係
              </Text>
              <Group gap="xs" wrap="wrap">
                <Paper withBorder p="xs" radius="sm">
                  <Text size="sm">📄 messages</Text>
                </Paper>
                <Text size="sm" c="dimmed">
                  .channelId →
                </Text>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="sm">📁 channels</Text>
                </Paper>
              </Group>
              <Group gap="xs" wrap="wrap">
                <Paper withBorder p="xs" radius="sm">
                  <Text size="sm">📄 messages</Text>
                </Paper>
                <Text size="sm" c="dimmed">
                  .authorId →
                </Text>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="sm">🧑 members</Text>
                </Paper>
              </Group>
              <Group gap="xs" wrap="wrap">
                <Paper withBorder p="xs" radius="sm">
                  <Text size="sm">👍 reactions</Text>
                </Paper>
                <Text size="sm" c="dimmed">
                  .messageId →
                </Text>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="sm">📄 messages</Text>
                </Paper>
              </Group>
              <Group gap="xs" wrap="wrap">
                <Paper withBorder p="xs" radius="sm">
                  <Text size="sm">👍 reactions</Text>
                </Paper>
                <Text size="sm" c="dimmed">
                  .memberId →
                </Text>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="sm">🧑 members</Text>
                </Paper>
              </Group>
            </Stack>
          </Paper>

          <Stack gap={4}>
            <Text size="sm" fw={600}>
              実コード: convex/schema.ts 全文
            </Text>
            <Code block>{SCHEMA_SNIPPET}</Code>
          </Stack>

          <Stack gap={4}>
            <Text size="sm" fw={600}>
              実コード: listByChannel のJOIN部分（著者とリアクションを合成する箇所）
            </Text>
            <Code block>{JOIN_SNIPPET}</Code>
            <Text size="xs" c="dimmed">
              このJOIN結果そのものがリアルタイムに購読される。誰かがリアクションを押せば、集計済みの結果が再配信される
            </Text>
          </Stack>

          <Text>
            RDBのようにJOINが書け、NoSQLのように柔軟で、しかもドキュメントの読み書きは全て自動的にトランザクショナルです（mutation単位でACID）。
          </Text>
        </Stack>

        <Stack gap="md">
          <Title order={2}>まとめ</Title>
          <List spacing="xs">
            <List.Item>リアルタイム = クエリ購読が標準装備</List.Item>
            <List.Item>リレーション = v.id + index + TypeScriptのJOIN</List.Item>
            <List.Item>型安全がスキーマからフロントまで一気通貫</List.Item>
            <List.Item>mutation = ACIDトランザクション</List.Item>
            <List.Item>スケジューラ内蔵（ctx.scheduler）</List.Item>
          </List>
          <div>
            <Button component={Link} to="/">
              デモに戻って2タブで体感する
            </Button>
          </div>
        </Stack>
      </Stack>
    </Container>
  )
}
