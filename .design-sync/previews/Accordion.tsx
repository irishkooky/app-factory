import { Accordion, Text } from '@app-factory/ui'

export const Basic = () => (
  <Accordion defaultValue="pricing" maw={480}>
    <Accordion.Item value="pricing">
      <Accordion.Control>料金について教えてください</Accordion.Control>
      <Accordion.Panel>
        <Text size="sm">
          app factory 自体の利用は無料です。デプロイ先の Cloudflare Workers は無料枠内であれば追加費用は発生しません。
        </Text>
      </Accordion.Panel>
    </Accordion.Item>

    <Accordion.Item value="deploy">
      <Accordion.Control>デプロイはどうやって行いますか</Accordion.Control>
      <Accordion.Panel>
        <Text size="sm">
          `apps/&lt;name&gt;` ディレクトリで `vp run build` を実行してビルドを確認したのち、`wrangler deploy`
          でそのままデプロイできます。
        </Text>
      </Accordion.Panel>
    </Accordion.Item>

    <Accordion.Item value="support">
      <Accordion.Control>サポート体制はありますか</Accordion.Control>
      <Accordion.Panel>
        <Text size="sm">
          障害時はSlackの #app-factory-support チャンネルで対応しています。営業日は9:00〜18:00で一次回答します。
        </Text>
      </Accordion.Panel>
    </Accordion.Item>
  </Accordion>
)

export const Contained = () => (
  <Accordion variant="contained" radius="md" defaultValue="item-2" maw={480}>
    <Accordion.Item value="item-1">
      <Accordion.Control>アプリの雛形は何ですか</Accordion.Control>
      <Accordion.Panel>
        <Text size="sm">`apps/hello` が新規アプリ作成時にコピーする雛形です。</Text>
      </Accordion.Panel>
    </Accordion.Item>
    <Accordion.Item value="item-2">
      <Accordion.Control>UIライブラリは変更できますか</Accordion.Control>
      <Accordion.Panel>
        <Text size="sm">Mantine v9 に固定されており、理由なく変更・置換はできません。</Text>
      </Accordion.Panel>
    </Accordion.Item>
  </Accordion>
)
