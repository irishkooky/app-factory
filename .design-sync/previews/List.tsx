import { Code, List } from '@app-factory/ui'

export const Unordered = () => (
  <List>
    <List.Item>常温で保存してください</List.Item>
    <List.Item>開封後は冷蔵庫で保管してください</List.Item>
    <List.Item>賞味期限は製造日から180日です</List.Item>
  </List>
)

export const Ordered = () => (
  <List type="ordered">
    <List.Item>アカウントを作成する</List.Item>
    <List.Item>支払い方法を登録する</List.Item>
    <List.Item>プランを選択して申し込む</List.Item>
  </List>
)

export const SpacingAndSize = () => (
  <List spacing="md" size="sm">
    <List.Item>注文確認メールが届きます</List.Item>
    <List.Item>発送準備が整い次第、発送通知をお送りします</List.Item>
    <List.Item>お届けまで通常3〜5営業日かかります</List.Item>
  </List>
)

export const WithIcon = () => (
  <List
    icon={
      <Code c="teal.6" fw={700}>
        ✓
      </Code>
    }
  >
    <List.Item>本人確認書類の提出が完了しました</List.Item>
    <List.Item>口座情報の登録が完了しました</List.Item>
    <List.Item>審査結果は3営業日以内にご連絡します</List.Item>
  </List>
)
