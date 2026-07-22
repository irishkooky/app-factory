export interface ClaudeModel {
  id: string
  name: string
  /** USD per 1M input tokens */
  inputPerMTok: number
  /** USD per 1M output tokens */
  outputPerMTok: number
}

export const MODELS: ClaudeModel[] = [
  { id: 'claude-fable-5', name: 'Claude Fable 5', inputPerMTok: 10, outputPerMTok: 50 },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', inputPerMTok: 5, outputPerMTok: 25 },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', inputPerMTok: 3, outputPerMTok: 15 },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', inputPerMTok: 1, outputPerMTok: 5 },
]

export const DEFAULT_BASE_MODEL_ID = 'claude-fable-5'

/** tokens: 非負整数を想定。cost in USD */
export function calcCost(model: ClaudeModel, inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * model.inputPerMTok
  const outputCost = (outputTokens / 1_000_000) * model.outputPerMTok
  return { inputCost, outputCost, total: inputCost + outputCost }
}

/** USDフォーマット。1未満は小数6桁まで、それ以上は小数2桁。 */
export function formatUsd(value: number): string {
  const abs = Math.abs(value)
  const digits = abs > 0 && abs < 1 ? 6 : 2
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}
