import { Stack, PasswordInput } from '@app-factory/ui'

export const Basic = () => (
  <PasswordInput label="パスワード" placeholder="8文字以上で入力" maw={320} />
)

export const Filled = () => (
  <PasswordInput label="現在のパスワード" defaultValue="hunter22" maw={320} />
)

export const Visible = () => (
  <PasswordInput
    label="新しいパスワード"
    defaultValue="hunter22"
    defaultVisible
    description="表示を切り替えて確認できます"
    maw={320}
  />
)

export const ErrorState = () => (
  <PasswordInput
    label="パスワード（確認）"
    withAsterisk
    defaultValue="abc"
    error="パスワードが一致しません"
    maw={320}
  />
)

export const Disabled = () => (
  <PasswordInput label="パスワード" defaultValue="hunter22" disabled maw={320} />
)
