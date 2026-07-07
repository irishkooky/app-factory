import { Stack, SegmentedControl } from '@app-factory/ui'

export const Basic = () => (
  <SegmentedControl
    data={['日', '週', '月', '年']}
    defaultValue="週"
    maw={280}
  />
)

export const FullWidth = () => (
  <SegmentedControl
    data={[
      { value: 'all', label: 'すべて' },
      { value: 'unread', label: '未読' },
      { value: 'archived', label: 'アーカイブ' },
    ]}
    defaultValue="unread"
    fullWidth
    maw={360}
  />
)

export const Sizes = () => (
  <Stack gap="sm" maw={320}>
    <SegmentedControl size="xs" data={['小', '中', '大']} defaultValue="中" />
    <SegmentedControl size="lg" data={['小', '中', '大']} defaultValue="大" />
  </Stack>
)

export const WithDisabledOption = () => (
  <SegmentedControl
    data={[
      { value: 'card', label: 'クレジットカード' },
      { value: 'bank', label: '銀行振込' },
      { value: 'cod', label: '代金引換', disabled: true },
    ]}
    defaultValue="card"
    maw={360}
  />
)

export const Disabled = () => (
  <SegmentedControl
    data={['公開', '下書き']}
    defaultValue="公開"
    disabled
    maw={280}
  />
)
