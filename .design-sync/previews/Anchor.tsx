import { Anchor, Stack, Text } from '@app-factory/ui'

export const InSentence = () => (
  <Text>
    詳しい料金については
    <Anchor href="#pricing"> 料金ページ </Anchor>
    をご確認ください。退会をご希望の方は
    <Anchor href="#cancel"> こちら </Anchor>
    から手続きできます。
  </Text>
)

export const UnderlineVariants = () => (
  <Stack gap="xs">
    <Anchor href="#" underline="always">
      常に下線: 利用規約を読む
    </Anchor>
    <Anchor href="#" underline="hover">
      ホバー時に下線: よくある質問
    </Anchor>
    <Anchor href="#" underline="never">
      下線なし: プライバシーポリシー
    </Anchor>
  </Stack>
)

export const ColorsAndSizes = () => (
  <Stack gap="xs">
    <Anchor href="#" c="indigo.6" size="sm">
      小さいリンク: サポートに問い合わせる
    </Anchor>
    <Anchor href="#" c="red.6" size="md">
      赤色のリンク: アカウントを削除する
    </Anchor>
    <Anchor href="#" size="lg" fw={700}>
      大きく太字のリンク: 今すぐ始める
    </Anchor>
  </Stack>
)
