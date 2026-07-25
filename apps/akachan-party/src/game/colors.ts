/** 参加者に割り当てる高彩度カラー。赤ちゃんが見分けやすい高コントラスト色を優先 */
export const PLAYER_COLORS: string[] = [
  '#FF3B30', '#FFCC00', '#0A84FF', '#34C759',
  '#FF2D95', '#FF9500', '#5E5CE6', '#00C7BE',
  '#FF6482', '#A2845E', '#BF5AF2', '#30D158',
  '#FF453A', '#FFD60A', '#64D2FF', '#66C24A',
  '#D46AFF', '#FF8A3D', '#4C6EF5', '#12B886',
]

export function colorOf(index: number): string {
  const n = PLAYER_COLORS.length
  const normalized = ((index % n) + n) % n
  return PLAYER_COLORS[normalized]
}
