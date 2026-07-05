export const CATEGORIES = ['outer', 'tops', 'bottoms', 'accessory'] as const
export type Category = (typeof CATEGORIES)[number]
export const CATEGORY_LABELS: Record<Category, string> = {
  outer: 'アウター',
  tops: 'トップス',
  bottoms: 'ボトムス',
  accessory: '小物',
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  outer: '🧥',
  tops: '👕',
  bottoms: '👖',
  accessory: '🧣',
}

export const COLORS = [
  'white',
  'black',
  'gray',
  'navy',
  'beige',
  'brown',
  'denim',
  'red',
  'pink',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
] as const
export type ItemColor = (typeof COLORS)[number]

export const COLOR_LABELS: Record<ItemColor, string> = {
  white: 'ホワイト',
  black: 'ブラック',
  gray: 'グレー',
  navy: 'ネイビー',
  beige: 'ベージュ',
  brown: 'ブラウン',
  denim: 'デニム',
  red: 'レッド',
  pink: 'ピンク',
  orange: 'オレンジ',
  yellow: 'イエロー',
  green: 'グリーン',
  blue: 'ブルー',
  purple: 'パープル',
}

export const COLOR_HEX: Record<ItemColor, string> = {
  white: '#f8f9fa',
  black: '#212529',
  gray: '#adb5bd',
  navy: '#1a2a52',
  beige: '#e8dcc8',
  brown: '#6b4a34',
  denim: '#4a6fa5',
  red: '#e03131',
  pink: '#e64980',
  orange: '#f76707',
  yellow: '#f5c211',
  green: '#2f9e44',
  blue: '#1c7ed6',
  purple: '#7048e8',
}

export interface ClothingItem {
  id: string // crypto.randomUUID()
  name: string
  category: Category
  warmth: number // 1..5
  color: ItemColor
  imageDataUrl?: string // 圧縮済みJPEG data URL
  createdAt: number
}

export interface Outfit {
  outer?: ClothingItem
  tops: ClothingItem
  bottoms: ClothingItem
  accessory?: ClothingItem
  keyItem: ClothingItem // 「今日の一着」
  comment: string // コーデの一言コメント
}
