import { Box, Button, Group } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Icon } from './Icon'

/** スマホで画面下に固定する電話・メールのボタン */
export function MobileCta() {
  const { contact } = site

  return (
    <Box
      bg="white"
      hiddenFrom="sm"
      p={8}
      pos="fixed"
      style={{ bottom: 0, left: 0, right: 0, zIndex: 200, boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}
    >
      <Group gap={8} grow wrap="nowrap">
        <Button component="a" href={tel} leftSection={<Icon name="phone" size={18} />} radius="xl" size="md">
          電話する
        </Button>
        {contact.email && (
          <Button
            component="a"
            href={`mailto:${contact.email}`}
            leftSection={<Icon name="mail" size={18} />}
            radius="xl"
            size="md"
            variant="outline"
          >
            メール
          </Button>
        )}
      </Group>
    </Box>
  )
}
