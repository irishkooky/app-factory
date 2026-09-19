import { SegmentedControl, Text } from '@mantine/core'
import { useState } from 'react'
import { comparisonModels, type ComparisonModelId } from '../lib/comparison'
import type { ModelStates } from './ComparisonLab'

type Props = { states: ModelStates; selectedModels: ComparisonModelId[]; batch: boolean }
type CostMode = 'standard' | 'billed'
const colors: Record<ComparisonModelId, string> = { jev: '#9bc7b7', gpt: '#eed189', gemini: '#9fbbd7', claude: '#dfa58e', qwen: '#c9a6dc' }
const formatMillis = (usd: number) => {
  const value = usd * 1000
  if (value > 0 && value < 0.001) return '<0.001 m$'
  return `${value.toPrecision(3)} m$`
}

export function ComparisonCharts({ states, selectedModels, batch }: Props) {
  const [costMode, setCostMode] = useState<CostMode>('standard')
  const models = comparisonModels.filter((model) => selectedModels.includes(model.id))
  const elapsed = models.map((model) => { const state = states[model.id]; return state?.status === 'success' ? state.elapsedMs / 1000 : undefined })
  const costs = models.map((model) => {
    const state = states[model.id]
    if (state?.status !== 'success') return undefined
    if (costMode === 'billed') return state.response.cost.billedUsd
    return state.response.cost.source === 'gateway-market' || state.response.cost.source === 'estimate' ? state.response.cost.usd : null
  })
  const maxElapsed = Math.max(0, ...elapsed.filter((value): value is number => value !== undefined))
  const maxCost = Math.max(0, ...costs.filter((value): value is number => value !== null && value !== undefined))
  const scope = batch ? '8件一括' : '1件'

  return <section className="comparison-charts" aria-label="速度と料金の比較">
    <article className="comparison-chart"><div className="chart-title"><div><span>FASTEST DESK</span><h2>速度部門</h2></div><Text size="xs">今回の{scope}呼び出し。短いほど速い。</Text></div>
      <div className="chart-rows">{models.map((model, index) => {
        const value = elapsed[index]; const state = states[model.id]
        return <div className="chart-row" key={model.id}><strong>{model.label}</strong>{value === undefined ? <span className="chart-empty">{state?.status === 'waiting' ? '応答待ち' : state?.status === 'error' ? '失敗' : state?.status === 'canceled' ? 'キャンセル' : '未実行'}</span> : <><div className="chart-track" aria-label={`${model.label} ${value.toFixed(2)}秒`}><i style={{ width: maxElapsed === 0 ? '0%' : `${value / maxElapsed * 100}%`, background: colors[model.id] }} /></div><span className="chart-value">{value.toFixed(2)}秒</span></>}</div>
      })}</div>
    </article>
    <article className="comparison-chart"><div className="chart-title"><div><span>COST DESK</span><h2>料金部門</h2></div><SegmentedControl size="xs" value={costMode} onChange={(value) => setCostMode(value as CostMode)} data={[{ value: 'standard', label: '標準料金' }, { value: 'billed', label: 'Gateway報告額' }]} /></div><Text size="xs" className="chart-note">今回の{scope}呼び出し。短いほど安い。1ミリドル（m$） = $0.001</Text>
      <div className="chart-rows">{models.map((model, index) => {
        const value = costs[index]; const state = states[model.id]
        const unavailable = value === null || value === undefined
        return <div className="chart-row" key={model.id}><strong>{model.label}</strong>{unavailable ? <span className="chart-empty">{state?.status === 'success' ? '取得不可' : state?.status === 'waiting' ? '応答待ち' : state?.status === 'error' ? '失敗' : state?.status === 'canceled' ? 'キャンセル' : '未実行'}</span> : <><div className="chart-track" title={`$${value}`} aria-label={`${model.label} ${formatMillis(value)}`}><i style={{ width: maxCost === 0 ? '0%' : `${value / maxCost * 100}%`, background: colors[model.id] }} /></div><span className="chart-value">{formatMillis(value)}{costMode === 'standard' && state?.status === 'success' && state.response.cost.source === 'estimate' ? <small>推定</small> : null}</span></>}</div>
      })}</div>
    </article>
  </section>
}
