import { Stack, NumberInput } from '@app-factory/ui'

export const Basic = () => (
  <NumberInput label="数量" placeholder="1" defaultValue={2} min={1} max={10} maw={280} />
)

export const WithSuffixAndPrefix = () => (
  <Stack gap="sm" maw={280}>
    <NumberInput label="価格" defaultValue={2980} prefix="¥" thousandSeparator maw={280} />
    <NumberInput label="割引率" defaultValue={15} suffix="%" min={0} max={100} />
  </Stack>
)

export const ErrorState = () => (
  <NumberInput
    label="年齢"
    withAsterisk
    defaultValue={12}
    min={18}
    error="18歳以上を入力してください"
    maw={280}
  />
)

export const HideControls = () => (
  <NumberInput
    label="郵便番号のような固定桁"
    defaultValue={1000001}
    hideControls
    maw={280}
  />
)

export const Disabled = () => (
  <NumberInput label="在庫数" defaultValue={0} disabled maw={280} />
)
