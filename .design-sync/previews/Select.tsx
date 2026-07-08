import { Stack, Select } from '@app-factory/ui'

const prefectures = ['北海道', '東京都', '大阪府', '福岡県', '沖縄県']

export const Basic = () => (
  <Select
    label="都道府県"
    placeholder="選択してください"
    data={prefectures}
    defaultValue="東京都"
    maw={280}
  />
)

export const WithDescription = () => (
  <Select
    label="お支払い方法"
    description="次回の請求から反映されます"
    data={['クレジットカード', '銀行振込', 'コンビニ払い']}
    defaultValue="クレジットカード"
    maw={280}
  />
)

export const SearchableClearable = () => (
  <Select
    label="担当者"
    data={['佐藤 一郎', '鈴木 花子', '高橋 健太', '田中 美咲']}
    defaultValue="鈴木 花子"
    searchable
    clearable
    maw={280}
  />
)

export const ErrorState = () => (
  <Select
    label="配送地域"
    withAsterisk
    data={prefectures}
    error="対応していない地域です"
    placeholder="選択してください"
    maw={280}
  />
)

export const Disabled = () => (
  <Select
    label="プラン"
    data={['フリー', 'スタンダード', 'プロ']}
    defaultValue="プロ"
    disabled
    maw={280}
  />
)
