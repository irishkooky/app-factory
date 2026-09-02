import type { ModelDef } from '../data/models'
import { USD_JPY } from '../data/models'

/** 1回の呼び出しのコスト(USD)を計算する。トークン数は 0 以上の整数を想定するが、負値・NaNは 0 として扱う */
export function calcCostUsd(inputTokens: number, outputTokens: number, model: Pick<ModelDef, 'inputPerM' | 'outputPerM'>): number {
  const inTok = Number.isFinite(inputTokens) && inputTokens > 0 ? inputTokens : 0
  const outTok = Number.isFinite(outputTokens) && outputTokens > 0 ? outputTokens : 0
  return (inTok / 1_000_000) * model.inputPerM + (outTok / 1_000_000) * model.outputPerM
}

/** USDを表示用に整形する。0.001未満は指数表記でなく有効数字2桁の小数で表示する(例: $0.00012) */
export function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '$0'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)

  if (abs >= 1) {
    return `${sign}$${abs.toFixed(2)}`
  }
  if (abs >= 0.001) {
    return `${sign}$${abs.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`
  }

  // 0.001未満: 有効数字2桁。toPrecision が極端に小さい値で指数表記になる場合のみフォールバックする
  const precise = abs.toPrecision(2)
  if (precise.includes('e')) {
    return `${sign}$${abs.toFixed(10).replace(/0+$/, '').replace(/\.$/, '')}`
  }
  return `${sign}$${precise}`
}

/** USDを円に換算して整数・3桁区切りで整形する(月額表示用) */
export function formatJpy(usd: number): string {
  if (!Number.isFinite(usd)) return '¥0'
  const jpy = Math.round(usd * USD_JPY)
  return `¥${jpy.toLocaleString('ja-JP')}`
}

/**
 * USDを円に換算し、1回あたりのコストとして整形する(小数を丸めない)。
 * 0.01円未満は有効数字2桁(例: ¥0.0042)、それ以上は小数2桁(例: ¥0.18)で表示する。
 */
export function formatJpyPerCall(usd: number): string {
  if (!Number.isFinite(usd) || usd === 0) return '¥0'
  const jpy = usd * USD_JPY
  const sign = jpy < 0 ? '-' : ''
  const abs = Math.abs(jpy)

  if (abs >= 0.01) {
    return `${sign}¥${abs.toFixed(2)}`
  }

  const precise = abs.toPrecision(2)
  if (precise.includes('e')) {
    return `${sign}¥${abs.toFixed(10).replace(/0+$/, '').replace(/\.$/, '')}`
  }
  return `${sign}¥${precise}`
}

/** 月間コストを計算する(USD) */
export function monthlyCost(costPerCallUsd: number, callsPerMonth: number): number {
  const cost = Number.isFinite(costPerCallUsd) && costPerCallUsd > 0 ? costPerCallUsd : 0
  const calls = Number.isFinite(callsPerMonth) && callsPerMonth > 0 ? callsPerMonth : 0
  return cost * calls
}
