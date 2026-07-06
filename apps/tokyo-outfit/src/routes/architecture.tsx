import { createFileRoute } from '@tanstack/react-router'
import {
  Badge,
  Card,
  Container,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'

export const Route = createFileRoute('/architecture')({
  component: ArchitectureComponent,
})

function ArchitectureComponent() {
  return (
    <Container size="sm" pb="xl">
      <Stack gap="lg">
        <Stack gap="xs">
          <Title order={1}>このアプリの仕組み</Title>
          <Text>
            Tokyo Outfit にはいわゆる「サーバー」がありません。Cloudflareの「エッジ」という仕組みで動いています。
            従来のサーバーと何が違うのかを見てみましょう。
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Card withBorder radius="md" padding="lg" bg="gray.0">
            <Stack gap="sm">
              <Title order={2} fz="lg">
                🖥 従来のサーバー
              </Title>
              <Stack gap="xs">
                <Text size="sm">🏢 世界のどこか1箇所のデータセンターで、1台のコンピュータが動き続ける</Text>
                <Text size="sm">
                  🔌 誰も使っていない深夜も電源ON → <b>使わなくても料金がかかる</b>
                </Text>
                <Text size="sm">
                  🔧 OSの更新・故障対応・アクセス急増の備えは<b>自分の仕事</b>
                </Text>
                <Text size="sm">🐢 サーバーが遠い国にあると、そのぶん表示が遅い</Text>
              </Stack>
            </Stack>
          </Card>

          <Card withBorder radius="md" padding="lg" style={{ borderColor: 'var(--mantine-color-indigo-5)', borderWidth: 2 }}>
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap">
                <Title order={2} fz="lg">
                  🌍 エッジ（このアプリ）
                </Title>
                <Badge color="indigo">採用</Badge>
              </Group>
              <Stack gap="xs">
                <Text size="sm">🗺 世界300以上の拠点に同じアプリのコピーが配られている</Text>
                <Text size="sm">
                  ⚡ リクエストが来た<b>瞬間だけ</b>起動する（このアプリの起動時間は約17ミリ秒）
                </Text>
                <Text size="sm">
                  💤 誰も使っていない間は眠っていて、<b>料金がほぼゼロ</b>（無料枠: 1日10万リクエスト）
                </Text>
                <Text size="sm">
                  🛠 機械の管理は全部Cloudflareの仕事。<b>こちらは管理不要</b>
                </Text>
                <Text size="sm">🚀 ユーザーに一番近い拠点が応答するから速い</Text>
              </Stack>
            </Stack>
          </Card>
        </SimpleGrid>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Title order={2} fz="lg">
              リクエストの流れ
            </Title>
            <Stack align="center" gap={4}>
              <FlowStep emoji="📱" title="あなた（例: 東京）" desc="アプリを開く" />
              <Text fz="xl" c="dimmed">
                ↓
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                一番近い拠点が自動で選ばれる
              </Text>
              <Text fz="xl" c="dimmed">
                ↓
              </Text>
              <FlowStep emoji="🌐" title="最寄りのCloudflare拠点（例: 東京）" desc="眠っていたアプリがその場で目を覚まして処理（約17ms）" />
              <Text fz="xl" c="dimmed">
                ↓
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                服のデータを読み書き
              </Text>
              <Text fz="xl" c="dimmed">
                ↓
              </Text>
              <FlowStep emoji="🗄" title="Workers KV（保存領域）" desc="登録した服とその写真が保存されている場所" />
            </Stack>
            <Text size="sm" c="dimmed" ta="center">
              旅行先の大阪や海外からアクセスしても、そこから一番近い拠点が応答します。どこにいても速いのはこのためです。
            </Text>
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Title order={2} fz="lg">
              💰 常時起動コストなし、とは
            </Title>
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>従来サーバー</Table.Td>
                  <Table.Td>
                    24時間365日 稼働しっぱなし = <b>8,760時間ぶんの料金</b>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>このアプリ</Table.Td>
                  <Table.Td>
                    1回のアクセスで動くのは0.02秒ほど。1日100回使っても稼働は合計<b>約2秒</b> = 無料枠内で
                    <b>0円</b>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="sm">従来サーバー（稼働率）</Text>
                <Text size="sm" c="dimmed">
                  100%
                </Text>
              </Group>
              <Progress value={100} color="gray" size="lg" />
              <Group justify="space-between">
                <Text size="sm">このアプリ（稼働率）</Text>
                <Text size="sm" c="dimmed">
                  0.01%未満
                </Text>
              </Group>
              <Progress value={0.01} color="indigo" size="lg" />
            </Stack>
            <Text size="xs" c="dimmed">
              アクセスが増えて無料枠を超えると従量課金になりますが、個人利用ではまず届きません。
            </Text>
          </Stack>
        </Card>

        <Stack gap="sm">
          <Title order={2} fz="lg">
            このアプリの構成要素
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Card withBorder radius="md" padding="lg">
              <Stack gap={4} align="center" ta="center">
                <Text fz={32}>⚛️</Text>
                <Text fw={600}>画面</Text>
                <Text size="sm" c="dimmed">
                  React 19 + TanStack Start + Mantine。エッジ上でHTMLを組み立てて返す（SSR）
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" padding="lg">
              <Stack gap={4} align="center" ta="center">
                <Text fz={32}>🗄</Text>
                <Text fw={600}>データ</Text>
                <Text size="sm" c="dimmed">
                  Workers KV。服の情報と写真をそのまま保存
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" padding="lg">
              <Stack gap={4} align="center" ta="center">
                <Text fz={32}>🌦</Text>
                <Text fw={600}>天気</Text>
                <Text size="sm" c="dimmed">
                  Open-Meteo API（無料）から東京の今日の予報を取得
                </Text>
              </Stack>
            </Card>
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  )
}

function FlowStep({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <Paper withBorder radius="md" p="md" w="100%" maw={360}>
      <Stack gap={2} align="center" ta="center">
        <Text fz={28}>{emoji}</Text>
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {desc}
        </Text>
      </Stack>
    </Paper>
  )
}
