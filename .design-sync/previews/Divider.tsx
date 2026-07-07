import { Box, Divider, Group, Stack, Text } from '@app-factory/ui'

export const Plain = () => (
  <Stack gap="md" w={360}>
    <Text size="sm">注文内容</Text>
    <Divider />
    <Text size="sm">配送先情報</Text>
  </Stack>
)

export const WithLabel = () => (
  <Stack gap="md" w={360}>
    <Divider label="ここから設定項目" labelPosition="center" />
    <Divider label="任意項目" labelPosition="left" />
    <Divider label="上級者向け" labelPosition="right" />
  </Stack>
)

export const Variants = () => (
  <Stack gap="md" w={360}>
    <Divider variant="solid" label="solid" />
    <Divider variant="dashed" label="dashed" />
    <Divider variant="dotted" label="dotted" />
  </Stack>
)

export const Vertical = () => (
  <Group h={60} gap="md">
    <Text size="sm">プロフィール</Text>
    <Divider orientation="vertical" />
    <Text size="sm">通知設定</Text>
    <Divider orientation="vertical" />
    <Text size="sm">支払い情報</Text>
  </Group>
)
