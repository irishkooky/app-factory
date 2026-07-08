import { Anchor, Breadcrumbs, Text } from '@app-factory/ui'

export const Basic = () => (
  <Breadcrumbs>
    <Anchor href="#" size="sm">
      ホーム
    </Anchor>
    <Anchor href="#" size="sm">
      アプリ一覧
    </Anchor>
    <Anchor href="#" size="sm">
      weather-dash
    </Anchor>
    <Text size="sm">設定</Text>
  </Breadcrumbs>
)

export const Short = () => (
  <Breadcrumbs separator="›">
    <Anchor href="#" size="sm">
      ホーム
    </Anchor>
    <Anchor href="#" size="sm">
      hello
    </Anchor>
    <Text size="sm">デプロイ履歴</Text>
  </Breadcrumbs>
)
