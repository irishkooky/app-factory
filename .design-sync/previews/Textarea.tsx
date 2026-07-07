import { Stack, Textarea } from '@app-factory/ui'

export const Basic = () => (
  <Textarea
    label="お問い合わせ内容"
    placeholder="ご質問・ご要望をご記入ください"
    maw={360}
  />
)

export const WithContent = () => (
  <Textarea
    label="配送に関するご要望"
    description="任意項目です"
    defaultValue={'不在時は宅配ボックスに\n入れておいてください。'}
    rows={3}
    maw={360}
  />
)

export const ErrorState = () => (
  <Textarea
    label="退会理由"
    withAsterisk
    defaultValue="特に"
    error="10文字以上でご記入ください"
    maw={360}
  />
)

export const Autosize = () => (
  <Textarea
    label="レビュー本文"
    autosize
    minRows={2}
    maxRows={5}
    defaultValue={'商品は思ったより早く届きました。\n梱包も丁寧で満足しています。\n次回もぜひ利用したいです。'}
    maw={360}
  />
)

export const Disabled = () => (
  <Stack gap="sm" maw={360}>
    <Textarea
      label="管理者コメント"
      defaultValue="このアカウントは審査中のため編集できません"
      disabled
    />
  </Stack>
)
