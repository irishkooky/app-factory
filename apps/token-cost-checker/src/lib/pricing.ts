export interface ModelPricing {
  id: string
  name: string
  /** USD per 1M input tokens */
  inputPerMTok: number
  /** USD per 1M output tokens */
  outputPerMTok: number
  note?: string
}

export const MODELS: ModelPricing[] = [
  { id: 'fable-5', name: 'Claude Fable 5', inputPerMTok: 10, outputPerMTok: 50 },
  { id: 'opus-4.8', name: 'Claude Opus 4.8', inputPerMTok: 5, outputPerMTok: 25 },
  {
    id: 'sonnet-5',
    name: 'Claude Sonnet 5',
    inputPerMTok: 3,
    outputPerMTok: 15,
    note: '2026-08-31まで導入価格 $2/$10 が適用',
  },
  { id: 'haiku-4.5', name: 'Claude Haiku 4.5', inputPerMTok: 1, outputPerMTok: 5 },
]

export const DEFAULT_BASELINE_ID = 'fable-5'

export interface CostBreakdown {
  inputCost: number
  outputCost: number
  totalCost: number
}

export function calcCost(
  model: ModelPricing,
  inputTokens: number,
  outputTokens: number,
): CostBreakdown {
  const inputCost = (inputTokens / 1_000_000) * model.inputPerMTok
  const outputCost = (outputTokens / 1_000_000) * model.outputPerMTok
  return { inputCost, outputCost, totalCost: inputCost + outputCost }
}

export function formatUSD(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(value) > 0 && Math.abs(value) < 0.01 ? 6 : 4,
  })
}
