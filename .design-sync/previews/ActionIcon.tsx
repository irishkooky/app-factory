import { ActionIcon, Group } from '@app-factory/ui'

export const Variants = () => (
  <Group>
    <ActionIcon variant="filled" aria-label="追加">＋</ActionIcon>
    <ActionIcon variant="light" aria-label="更新">↻</ActionIcon>
    <ActionIcon variant="outline" aria-label="設定">⚙</ActionIcon>
    <ActionIcon variant="subtle" aria-label="閉じる">✕</ActionIcon>
    <ActionIcon variant="default" aria-label="その他">⋯</ActionIcon>
    <ActionIcon variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} aria-label="お気に入り">★</ActionIcon>
  </Group>
)

export const Sizes = () => (
  <Group align="center">
    <ActionIcon size="xs" aria-label="xs">＋</ActionIcon>
    <ActionIcon size="sm" aria-label="sm">＋</ActionIcon>
    <ActionIcon size="md" aria-label="md">＋</ActionIcon>
    <ActionIcon size="lg" aria-label="lg">＋</ActionIcon>
    <ActionIcon size="xl" aria-label="xl">＋</ActionIcon>
  </Group>
)

export const Colors = () => (
  <Group>
    <ActionIcon color="red" variant="filled" aria-label="削除">✕</ActionIcon>
    <ActionIcon color="green" variant="filled" aria-label="承認">✓</ActionIcon>
    <ActionIcon color="gray" variant="light" aria-label="無効化">⚙</ActionIcon>
  </Group>
)

export const States = () => (
  <Group>
    <ActionIcon loading aria-label="読み込み中">↻</ActionIcon>
    <ActionIcon disabled aria-label="無効">✕</ActionIcon>
    <ActionIcon variant="outline" disabled aria-label="無効(outline)">⚙</ActionIcon>
  </Group>
)
