import { Anchor, Divider, Stack, Text } from '@mantine/core'

export function SourcesFooter() {
  return (
    <Stack gap="xs">
      <Divider />
      <Text size="sm" c="dimmed">
        出典:{' '}
        <Anchor
          href="https://nextagile.ai/blogs/gen-ai/prompt-engineering-to-loop-engineering/"
          target="_blank"
          rel="noreferrer"
        >
          Addy Osmani “Loop Engineering” (2026)
        </Anchor>
        {' ・ '}
        <Anchor
          href="https://www.aibuilderclub.com/blog/loop-engineering-guide-2026"
          target="_blank"
          rel="noreferrer"
        >
          Peter Steinberger による問題提起 (2026年6月)
        </Anchor>
        {' ・ '}
        <Anchor
          href="https://smartscope.blog/en/generative-ai/methodology/loop-engineering-agent-loops-2026/"
          target="_blank"
          rel="noreferrer"
        >
          Boris Cherny の発言 (2026年6月)
        </Anchor>
      </Text>
      <Text size="sm" c="dimmed">
        このシミュレーターは概念理解のための模擬であり、実際のAIの挙動を正確に再現するものではありません。
      </Text>
    </Stack>
  )
}
