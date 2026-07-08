import { Badge, Button, Group, Paper, Text } from '@app-factory/ui'

export const Basic = () => (
  <Group>
    <Button>保存</Button>
    <Button variant="outline">キャンセル</Button>
    <Badge color="teal">下書き</Badge>
  </Group>
)

export const JustifySweep = () => (
  <Paper withBorder p="sm" maw={420}>
    <Group justify="space-between" mb="xs">
      <Text size="sm">注文番号 #10432</Text>
      <Badge>処理中</Badge>
    </Group>
    <Group justify="flex-end">
      <Button size="xs" variant="light">詳細</Button>
    </Group>
  </Paper>
)

export const WrapAndGap = () => (
  <Group gap="xs" wrap="wrap" maw={220}>
    <Badge>東京</Badge>
    <Badge>大阪</Badge>
    <Badge>名古屋</Badge>
    <Badge>福岡</Badge>
    <Badge>札幌</Badge>
    <Badge>仙台</Badge>
  </Group>
)
