import { Code, Stack, Text } from '@app-factory/ui'

export const Inline = () => (
  <Text>
    設定ファイルの <Code>wrangler.jsonc</Code> に <Code>name</Code>{' '}
    フィールドを追加してください。
  </Text>
)

export const Block = () => (
  <Code block>
    {`vp install
vp run build
wrangler deploy`}
  </Code>
)

export const ColoredInline = () => (
  <Stack gap="xs">
    <Text>
      エラーコード <Code color="red.1" c="red.9">E_TIMEOUT</Code> が発生した場合は再試行してください。
    </Text>
    <Text>
      ステータス <Code color="teal.1" c="teal.9">200 OK</Code> であれば処理は成功です。
    </Text>
  </Stack>
)
