import { Button, Group } from '@app-factory/ui'

export const Variants = () => (
  <Group>
    <Button>保存する</Button>
    <Button variant="light">下書き保存</Button>
    <Button variant="outline">キャンセル</Button>
    <Button variant="subtle">戻る</Button>
  </Group>
)

export const Sizes = () => (
  <Group align="center">
    <Button size="xs">XS</Button>
    <Button size="sm">小</Button>
    <Button size="md">中</Button>
    <Button size="lg">大</Button>
  </Group>
)

export const States = () => (
  <Group>
    <Button loading>送信中</Button>
    <Button disabled>無効</Button>
    <Button color="red" variant="filled">削除</Button>
  </Group>
)

export const FullWidth = () => <Button fullWidth>アカウントを作成</Button>
