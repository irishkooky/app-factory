import { ThemeIcon } from '@mantine/core'
import { Icon, type IconName } from './Icon'

/** 丸い下地にアイコンを載せる。症状・強み・クチコミの見出しに使う */
export function IconBadge({ name, size = 52 }: { name: IconName; size?: number }) {
  return (
    <ThemeIcon color="brand" radius="xl" size={size} variant="light">
      <Icon name={name} size={Math.round(size * 0.48)} />
    </ThemeIcon>
  )
}
