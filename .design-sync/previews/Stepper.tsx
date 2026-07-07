import { Stepper, Text } from '@app-factory/ui'

export const Basic = () => (
  <Stepper active={1} maw={640}>
    <Stepper.Step label="テンプレート選択" description="apps/hello をコピー">
      <Text size="sm">`apps/hello` を `apps/&lt;name&gt;` としてコピーします。</Text>
    </Stepper.Step>
    <Stepper.Step label="実装" description="ルートとロジックを追加">
      <Text size="sm">`src/routes/` 配下にページを追加し、必要なAPI連携を実装します。</Text>
    </Stepper.Step>
    <Stepper.Step label="ビルド確認" description="vp run build">
      <Text size="sm">アプリディレクトリで `vp run build` を実行し、ビルドが通ることを確認します。</Text>
    </Stepper.Step>
    <Stepper.Step label="デプロイ" description="wrangler deploy">
      <Text size="sm">`wrangler deploy` で本番環境へ反映し、URLを確認します。</Text>
    </Stepper.Step>
    <Stepper.Completed>
      <Text size="sm">全ステップが完了しました。PRを作成してマージまで進めてください。</Text>
    </Stepper.Completed>
  </Stepper>
)

export const Vertical = () => (
  <Stepper active={2} orientation="vertical" maw={360}>
    <Stepper.Step label="要件整理" description="仕様書を作成" />
    <Stepper.Step label="実装" description="Sonnetサブエージェントへ委任" />
    <Stepper.Step label="レビュー" description="堅牢性・型安全性を確認" />
    <Stepper.Step label="リリース" description="デプロイとPRマージ" />
  </Stepper>
)
