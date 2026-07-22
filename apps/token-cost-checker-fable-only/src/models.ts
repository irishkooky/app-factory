export interface ClaudeModel {
  id: string
  name: string
  /** USD per 1M input tokens */
  inputPerMTok: number
  /** USD per 1M output tokens */
  outputPerMTok: number
  color: string
}

export const MODELS: ClaudeModel[] = [
  {
    id: 'claude-fable-5',
    name: 'Claude Fable 5',
    inputPerMTok: 10,
    outputPerMTok: 50,
    color: 'grape',
  },
  {
    id: 'claude-opus-4-8',
    name: 'Claude Opus 4.8',
    inputPerMTok: 5,
    outputPerMTok: 25,
    color: 'indigo',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    inputPerMTok: 3,
    outputPerMTok: 15,
    color: 'teal',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    inputPerMTok: 1,
    outputPerMTok: 5,
    color: 'orange',
  },
]

export const DEFAULT_BASE_MODEL_ID = 'claude-fable-5'

export interface CostBreakdown {
  model: ClaudeModel
  inputCost: number
  outputCost: number
  totalCost: number
}

const MTOK = 1_000_000

export function calcCost(model: ClaudeModel, inputTokens: number, outputTokens: number): CostBreakdown {
  const inputCost = (inputTokens / MTOK) * model.inputPerMTok
  const outputCost = (outputTokens / MTOK) * model.outputPerMTok
  return {
    model,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  }
}

export function formatUsd(value: number): string {
  if (value === 0) return '$0.00'
  if (value > 0 && value < 0.0001) return '< $0.0001'
  const digits = value < 1 ? 4 : 2
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })}`
}
