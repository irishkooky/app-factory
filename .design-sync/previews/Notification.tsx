import { Notification, Stack } from '@app-factory/ui'

export const Basic = () => (
  <Notification title="新しいメッセージ" maw={340}>
    田中さんからコメントが届きました。確認をお願いします。
  </Notification>
)

export const Colors = () => (
  <Stack gap="sm" maw={340}>
    <Notification color="teal" title="保存完了">
      変更内容が正常に保存されました。
    </Notification>
    <Notification color="yellow" title="要確認">
      入力内容に不備がある可能性があります。
    </Notification>
    <Notification color="red" title="送信エラー">
      ネットワーク接続を確認してもう一度お試しください。
    </Notification>
  </Stack>
)

export const Loading = () => (
  <Notification loading title="アップロード中" maw={340} withCloseButton={false}>
    ファイルをアップロードしています。しばらくお待ちください…
  </Notification>
)

export const WithoutCloseButton = () => (
  <Notification color="indigo" title="お知らせ" withCloseButton={false} maw={340}>
    このお知らせは自動的に消えます。閉じるボタンはありません。
  </Notification>
)
