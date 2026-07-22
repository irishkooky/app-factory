export type ModelId = 'fable-5' | 'opus-4-8' | 'sonnet-5' | 'haiku-4-5'

export interface ModelPricing {
  id: ModelId
  name: string
  inputPerMTok: number // USD per 1M input tokens
  outputPerMTok: number // USD per 1M output tokens
}

export const MODELS: readonly ModelPricing[] = [
  { id: 'fable-5', name: 'Claude Fable 5', inputPerMTok: 10, outputPerMTok: 50 },
  { id: 'opus-4-8', name: 'Claude Opus 4.8', inputPerMTok: 5, outputPerMTok: 25 },
  { id: 'sonnet-5', name: 'Claude Sonnet 5', inputPerMTok: 3, outputPerMTok: 15 },
  { id: 'haiku-4-5', name: 'Claude Haiku 4.5', inputPerMTok: 1, outputPerMTok: 5 },
] as const

/**
 * Mantine の NumberInput の onChange は `string | number` を返しうるため、
 * 常に非負の整数トークン数へ正規化する。不正な値（NaN・負値など）は 0 にフォールバックする。
 */
export function normalizeTokens(value: string | number | undefined | null): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

/**
 * 指定モデルの単価で、入力/出力トークン数から概算コスト（USD）を計算する。
 */
export function calcCost(
  model: ModelPricing,
  inputTokens: number,
  outputTokens: number,
): { inputCost: number; outputCost: number; total: number } {
  const inputCost = (inputTokens / 1_000_000) * model.inputPerMTok
  const outputCost = (outputTokens / 1_000_000) * model.outputPerMTok
  return { inputCost, outputCost, total: inputCost + outputCost }
}

/** USD金額を `$1,234.5678` 形式の文字列に整形する。 */
export function formatUsd(v: number): string {
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

/** 基準モデルとの差額を符号付きで整形する（0は `±$0.00`）。 */
export function formatDiff(diff: number): string {
  if (diff === 0) return '±$0.00'
  if (diff > 0) return '+' + formatUsd(diff)
  return '-' + formatUsd(Math.abs(diff))
}

/**
 * 基準モデル比の削減率（%）。基準合計が0以下の場合はゼロ除算になるため `null` を返す。
 * 正の値は削減、負の値は増加を意味する。
 */
export function savingsRate(baseTotal: number, total: number): number | null {
  if (baseTotal <= 0) return null
  return ((baseTotal - total) / baseTotal) * 100
}
