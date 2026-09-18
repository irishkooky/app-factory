import type { FormRecord } from '../lib/semantic'

export const samples: Array<{ id: string; label: string; teaser: string; record: FormRecord }> = [
  {
    id: 'swapped', label: '名前と会社が逆', teaser: '担当者と会社名の席替え。',
    record: { id: 'sample-swapped', name: '株式会社北極星', company: '山本花', email: 'hana@example.test', category: 'billing', message: '先月分の二重請求について、請求番号INV-204を確認したいです。' },
  },
  {
    id: 'brand', label: '屋号だけですが何か？', teaser: '法人格なしの屋号。',
    record: { id: 'sample-brand', name: '佐藤海', company: '灯台コーヒー', email: 'umi@example.test', category: 'sales', message: 'イベント用にドリップバッグを200個注文できるか相談したいです。' },
  },
  {
    id: 'misrouted', label: '返金なのに不具合窓口', teaser: '本文は返金の相談。',
    record: { id: 'sample-misrouted', name: '井上直', company: '青葉デザイン', email: 'nao@example.test', category: 'support', message: '解約済みの月額料金が今月も決済されました。返金方法を教えてください。' },
  },
  {
    id: 'vague', label: 'いい感じにお願いします', teaser: '気持ちは十分、情報は少なめ。',
    record: { id: 'sample-vague', name: '小川真', company: 'ふわり商店', email: 'makoto@example.test', category: 'other', message: 'お問い合わせフォームをいい感じにしてください！よろしくお願いします。' },
  },
  {
    id: 'ready', label: '全部ちゃんと書いた', teaser: '受付さん、うなずける。',
    record: { id: 'sample-ready', name: '田中遥', company: 'ノースリーフ合同会社', email: 'haruka@example.test', category: 'support', message: '管理画面でCSVをアップロードすると「形式が不正です」と表示されます。9月17日10時ごろから発生し、Chrome で再ログインも試しました。' },
  },
]

export const batchRecords: FormRecord[] = [
  samples[0].record,
  samples[1].record,
  samples[2].record,
  samples[3].record,
  samples[4].record,
  { id: 'batch-6', name: '森川結衣', company: '森川結衣', email: 'yui@example.test', category: 'sales', message: '個人事業の制作依頼について、納期を相談したいです。' },
  { id: 'batch-7', name: '鈴木圭', company: 'すずき工房', email: 'kei@example.test', category: 'billing', message: '領収書の宛名を「すずき工房」に変更したいです。注文番号はA-118です。' },
  { id: 'batch-8', name: '山岸修', company: 'クローバー物流', email: 'osamu@example.test', category: 'support', message: '配送状況の画面が昨日から読み込めません。東京便の一覧を開くと真っ白になります。' },
]
