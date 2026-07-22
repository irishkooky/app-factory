export interface ModelPricing {
  id: string
  name: string
  inputPricePerMTok: number
  outputPricePerMTok: number
}

export const MODELS: ModelPricing[] = [
  { id: 'fable-5', name: 'Claude Fable 5', inputPricePerMTok: 10, outputPricePerMTok: 50 },
  { id: 'opus-4-8', name: 'Claude Opus 4.8', inputPricePerMTok: 5, outputPricePerMTok: 25 },
  { id: 'sonnet-5', name: 'Claude Sonnet 5', inputPricePerMTok: 3, outputPricePerMTok: 15 },
  { id: 'haiku-4-5', name: 'Claude Haiku 4.5', inputPricePerMTok: 1, outputPricePerMTok: 5 },
]

export const DEFAULT_BASELINE_ID = 'fable-5'

export function findModel(id: string): ModelPricing | undefined {
  return MODELS.find((model) => model.id === id)
}

export interface ModelCost {
  inputCost: number
  outputCost: number
  totalCost: number
}

export function calcCost(pricing: ModelPricing, inputTokens: number, outputTokens: number): ModelCost {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMTok
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMTok
  return { inputCost, outputCost, totalCost: inputCost + outputCost }
}

export interface ModelComparisonRow {
  model: ModelPricing
  cost: ModelCost
  diffFromBaseline: number
  reductionPctFromBaseline: number | null
  isBaseline: boolean
}

export function buildComparison(
  inputTokens: number,
  outputTokens: number,
  baselineId: string,
): ModelComparisonRow[] {
  const baselineModel = findModel(baselineId) ?? findModel(DEFAULT_BASELINE_ID)!
  const baselineCost = calcCost(baselineModel, inputTokens, outputTokens)

  return MODELS.map((model) => {
    const cost = calcCost(model, inputTokens, outputTokens)
    const diffFromBaseline = cost.totalCost - baselineCost.totalCost
    const reductionPctFromBaseline =
      baselineCost.totalCost > 0 ? ((baselineCost.totalCost - cost.totalCost) / baselineCost.totalCost) * 100 : null

    return {
      model,
      cost,
      diffFromBaseline,
      reductionPctFromBaseline,
      isBaseline: model.id === baselineModel.id,
    }
  })
}

export function formatUSD(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const decimals = abs !== 0 && abs < 1 ? 4 : 2
  return `${sign}$${abs.toFixed(decimals)}`
}

export function formatSignedUSD(value: number): string {
  if (value === 0) return '±$0.00'
  const sign = value > 0 ? '+' : '-'
  const abs = Math.abs(value)
  const decimals = abs < 1 ? 4 : 2
  return `${sign}$${abs.toFixed(decimals)}`
}

export function formatPct(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '' : '±'
  return `${sign}${value.toFixed(1)}%`
}
