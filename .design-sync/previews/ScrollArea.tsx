import { Box, Divider, ScrollArea, Stack, Text, Title } from '@app-factory/ui'

const notices = [
  'システムメンテナンスのお知らせ: 7月10日 深夜2時〜4時にサーバーメンテナンスを実施します。',
  '料金プラン改定のお知らせ: 8月1日よりスタンダードプランの料金を改定いたします。',
  '夏季休業のお知らせ: 8月13日〜8月16日はサポート窓口を休業とさせていただきます。',
  '新機能リリースのお知らせ: ダークモード表示に対応いたしました。設定画面よりお試しください。',
  '障害復旧のご報告: 本日発生していた通知遅延の不具合は復旧いたしました。ご迷惑をおかけしました。',
]

export const FixedHeight = () => (
  <ScrollArea h={180} w={360} type="auto">
    <Stack gap="sm" p="xs">
      <Title order={5}>お知らせ一覧</Title>
      {notices.map((n) => (
        <Text key={n} size="sm">
          {n}
        </Text>
      ))}
    </Stack>
  </ScrollArea>
)

export const AlwaysVisibleScrollbar = () => (
  <ScrollArea h={140} w={320} type="always" scrollbarSize={10}>
    <Stack gap={4} p="xs">
      {Array.from({ length: 12 }, (_, i) => (
        <Box key={i}>
          <Text size="sm">第{i + 1}条: 本サービスの利用規約に関する条文です。</Text>
          <Divider my={4} />
        </Box>
      ))}
    </Stack>
  </ScrollArea>
)
