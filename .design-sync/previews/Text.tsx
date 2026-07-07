import { Stack, Text } from '@app-factory/ui'

export const Sizes = () => (
  <Stack gap="xs">
    <Text size="xs">サイズ xs: 領収書の但し書きなど</Text>
    <Text size="sm">サイズ sm: 補足説明のテキスト</Text>
    <Text size="md">サイズ md: 標準の本文テキスト</Text>
    <Text size="lg">サイズ lg: 少し強調したい本文</Text>
    <Text size="xl">サイズ xl: 見出しに近い強調文</Text>
  </Stack>
)

export const Colors = () => (
  <Stack gap="xs">
    <Text c="indigo.6">indigo: ブランドカラーのテキスト</Text>
    <Text c="red.6">red: エラーメッセージのテキスト</Text>
    <Text c="teal.6">teal: 成功メッセージのテキスト</Text>
    <Text c="dimmed">dimmed: 補足・注釈のテキスト</Text>
  </Stack>
)

export const Weights = () => (
  <Stack gap="xs">
    <Text fw={400}>通常の太さ: ご注文内容の確認</Text>
    <Text fw={600}>やや太字: 合計金額 3,980円</Text>
    <Text fw={700}>太字: お支払い期限は今月末です</Text>
  </Stack>
)

export const TruncatedAndClamped = () => (
  <Stack gap="xs" w={280}>
    <Text truncate="end">
      これは非常に長い一行のテキストで、幅を超えた分は末尾が省略記号になります
    </Text>
    <Text lineClamp={2}>
      複数行のテキストを2行までに制限するサンプルです。
      3行目以降の内容は表示されずに省略記号で切り詰められます。これはお知らせ欄などでよく使われる表現です。
    </Text>
  </Stack>
)
