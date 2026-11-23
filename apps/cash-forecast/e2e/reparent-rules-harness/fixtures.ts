import type { Doc, Id } from '../../convex/_generated/dataModel'
import { buildForecast } from '../../src/lib/forecast'
import { buildForecastReparentCandidates } from '../../src/lib/reparentCandidates'
import type { ForecastRow } from '../../src/lib/forecast'

const userId = 'harness-user'
const ruleId = 'rule_rent' as Id<'rules'>
const txManual = 'tx_manual' as Id<'transactions'>
const txConfirmed = 'tx_confirmed' as Id<'transactions'>

const anchorDate = '2026-03-15'
const horizonEnd = '2027-03-15'

export const harnessRules: Doc<'rules'>[] = [
  {
    _id: ruleId,
    _creationTime: 0,
    userId,
    name: '家賃',
    kind: 'expense',
    amount: 130_000,
    dayOfMonth: 25,
  },
  {
    _id: 'rule_card' as Id<'rules'>,
    _creationTime: 0,
    userId,
    name: 'カード引き落とし',
    kind: 'expense',
    amount: 45_000,
    dayOfMonth: 10,
  },
]

export const harnessTransactionsBefore: Doc<'transactions'>[] = [
  {
    _id: txManual,
    _creationTime: 1,
    userId,
    date: '2026-04-10',
    name: '4月の支出',
    kind: 'expense',
    amount: 54_000,
    amountBreakdown: [
      { amount: 50_000, label: '生活費' },
      { amount: 4_000, label: '繰越分' },
    ],
  },
  {
    _id: 'tx_grocery' as Id<'transactions'>,
    _creationTime: 2,
    userId,
    date: '2026-05-01',
    name: '食料品',
    kind: 'expense',
    amount: 12_000,
  },
  {
    _id: txConfirmed,
    _creationTime: 3,
    userId,
    date: '2026-06-25',
    name: '家賃（6月確定）',
    kind: 'expense',
    amount: 132_000,
    ruleId,
    ruleMonth: '2026-06',
  },
]

export const harnessAddonAfter: Doc<'transactions'> = {
  _id: 'tx_addon' as Id<'transactions'>,
  _creationTime: 4,
  userId,
  date: '2026-11-25',
  name: '繰越分',
  kind: 'expense',
  amount: 4_000,
  ruleId,
  ruleMonth: '2026-11',
  addon: true,
}

export function harnessTransactionsAfter(): Doc<'transactions'>[] {
  const source = { ...harnessTransactionsBefore[0]! }
  source.amount = 50_000
  source.amountBreakdown = [{ amount: 50_000, label: '生活費' }]
  return [source, harnessTransactionsBefore[1]!, harnessTransactionsBefore[2]!, harnessAddonAfter]
}

export function buildHarnessForecast(transactions: Doc<'transactions'>[]): ForecastRow[] {
  return buildForecast({
    anchorDate,
    anchorBalance: 500_000,
    threshold: 50_000,
    rules: harnessRules,
    transactions,
    horizonEnd,
  })
}

export function buildHarnessCandidates(transactions: Doc<'transactions'>[]) {
  const forecast = buildHarnessForecast(transactions)
  return buildForecastReparentCandidates({
    transactions,
    forecast,
    rules: harnessRules,
    anchorDate,
    horizonEnd,
  })
}