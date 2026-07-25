/** 参加者に割り当てる高彩度カラー。赤ちゃんが見分けやすい高コントラスト色を優先 */
export const PLAYER_COLORS: string[] = [
  '#FF3B30', '#FFCC00', '#0A84FF', '#34C759',
  '#FF2D95', '#FF9500', '#5E5CE6', '#00C7BE',
  '#FF6482', '#A2845E', '#BF5AF2', '#30D158',
  '#FF453A', '#FFD60A', '#64D2FF', '#66C24A',
  '#D46AFF', '#FF8A3D', '#3A45C0', '#12B886',
]

export function colorOf(index: number): string {
  const n = PLAYER_COLORS.length
  const normalized = ((index % n) + n) % n
  return PLAYER_COLORS[normalized]
}

/** 背景色 hex に対して読みやすい文字色（黒 or 白）を相対輝度から判定する */
export function textOn(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  // 黒と白のコントラスト比が等しくなる分岐点は輝度 0.179。
  // ここを境に「よりコントラストの高い方」を選ぶと、全パレット色で 4.5:1 以上を確保できる。
  return luminance > 0.179 ? '#111111' : '#FFFFFF'
}
