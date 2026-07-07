import { Alert, Stack } from '@app-factory/ui'

export const Variants = () => (
  <Stack gap="sm" maw={380}>
    <Alert variant="filled" color="indigo" title="お知らせ">
      新しいアップデートが利用可能です。設定画面から適用できます。
    </Alert>
    <Alert variant="light" color="indigo" title="お知らせ">
      新しいアップデートが利用可能です。設定画面から適用できます。
    </Alert>
    <Alert variant="outline" color="indigo" title="お知らせ">
      新しいアップデートが利用可能です。設定画面から適用できます。
    </Alert>
    <Alert variant="transparent" color="indigo" title="お知らせ">
      新しいアップデートが利用可能です。設定画面から適用できます。
    </Alert>
  </Stack>
)

export const Colors = () => (
  <Stack gap="sm" maw={380}>
    <Alert color="teal" title="保存しました">
      変更内容は自動的に保存されました。
    </Alert>
    <Alert color="yellow" title="確認してください">
      在庫が残りわずかです。発注をご検討ください。
    </Alert>
    <Alert color="red" title="エラーが発生しました">
      決済処理に失敗しました。カード情報をご確認ください。
    </Alert>
  </Stack>
)

export const WithCloseButton = () => (
  <Alert
    color="indigo"
    variant="light"
    title="メンテナンスのお知らせ"
    withCloseButton
    maw={380}
  >
    7月10日 深夜2時〜4時にシステムメンテナンスを実施します。この間はご利用いただけません。
  </Alert>
)

export const BodyOnly = () => (
  <Alert color="gray" variant="light" maw={380}>
    タイトルなしで本文のみを表示するパターンです。
  </Alert>
)
