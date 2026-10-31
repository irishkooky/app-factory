import { Box, Button, Group } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Icon } from './Icon'
import { OpenNow } from './OpenNow'

/** スマホで画面下に固定する電話の帯。今が受付中かどうかも出す */
export function MobileCta() {
  return (
    <Box
      hiddenFrom="sm"
      pos="fixed"
      px={12}
      py={10}
      style={{
        backdropFilter: 'blur(10px)',
        background: 'color-mix(in srgb, var(--st-paper) 94%, transparent)',
        borderTop: '1px solid color-mix(in srgb, var(--st-ink) 8%, transparent)',
        bottom: 0,
        left: 0,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        right: 0,
        zIndex: 200,
      }}
    >
      <Group gap={10} justify="space-between" wrap="nowrap">
        <Box style={{ minWidth: 0, overflow: 'hidden' }}>
          <OpenNow brief compact />
        </Box>
        <Button
          className="st-cta-ink"
          component="a"
          h={50}
          href={tel}
          leftSection={<Icon name="phone" size={18} />}
          px={22}
          radius="xl"
          style={{ flex: 'none' }}
          styles={{ label: { fontSize: 16, letterSpacing: '0.03em' } }}
        >
          {site.contact.phone.replaceAll('-', ' ')}
        </Button>
      </Group>
    </Box>
  )
}
