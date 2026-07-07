import { Avatar, Group } from '@app-factory/ui'

const photo =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%234c6ef5'/><text x='50%' y='55%' fill='white' font-size='28' text-anchor='middle'>写</text></svg>"

export const Initials = () => (
  <Group>
    <Avatar name="黒崎 良弘" color="initials" />
    <Avatar name="佐藤 花子" color="initials" />
    <Avatar name="田中 太郎" color="initials" />
  </Group>
)

export const Colors = () => (
  <Group>
    <Avatar color="indigo">AF</Avatar>
    <Avatar color="teal">UI</Avatar>
    <Avatar color="red">管</Avatar>
    <Avatar color="yellow">担</Avatar>
  </Group>
)

export const Sizes = () => (
  <Group align="center">
    <Avatar size="xs" name="小" color="initials" />
    <Avatar size="sm" name="小" color="initials" />
    <Avatar size="md" name="中" color="initials" />
    <Avatar size="lg" name="大" color="initials" />
    <Avatar size="xl" name="特大" color="initials" />
  </Group>
)

export const PhotoAndFallback = () => (
  <Group>
    <Avatar src={photo} alt="プロフィール写真" />
    <Avatar src={null} alt="画像なし" name="山田 次郎" color="initials" />
  </Group>
)

export const GroupedAvatars = () => (
  <Avatar.Group>
    <Avatar name="鈴木 一郎" color="initials" />
    <Avatar name="高橋 美咲" color="initials" />
    <Avatar name="伊藤 健太" color="initials" />
    <Avatar>+5</Avatar>
  </Avatar.Group>
)
