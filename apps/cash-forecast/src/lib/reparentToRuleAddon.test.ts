import { describe, expect, it } from 'vitest'
import {
  computeReparentToRuleAddon,
  computeUndoReparentToRuleAddon,
  addonNameFromLine,
} from './reparentToRuleAddon'
import type { ReparentTxSnapshot } from './reparentBreakdown'
import { buildForecast } from './forecast'
import type { Doc, Id } from '../../convex/_generated/dataModel'

const anchorDate = '2026-03-15'
const horizonEnd = '2027-03-15'
const ruleId = 'rule1' as Id<'rules'>
const userId = 'user1'

function tx(partial: Partial<ReparentTxSnapshot> & Pick<ReparentTxSnapshot, 'id'>): ReparentTxSnapshot {
  return {
    kind: 'expense',
    amount: 10000,
    date: '2026-04-01',
    ...partial,
  }
}

describe('computeReparentToRuleAddon', () => {
  it('ソースから行を削り addon ペイロードを作る', () => {
    const result = computeReparentToRuleAddon({
      source: tx({
        id: 's1',
        amount: 5000,
        amountBreakdown: [
          { amount: 3000, label: 'A' },
          { amount: 2000 },
        ],
      }),
      target: { ruleId, ruleMonth: '2026-11', date: '2026-11-25' },
      index: 0,
      expectedAmount: 3000,
      expectedLabel: 'A',
      anchorDate,
      horizonEnd,
      targetMonthHasOverride: false,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.source).toEqual({
      amount: 2000,
      amountBreakdown: undefined,
    })
    expect(result.addon).toEqual({
      date: '2026-11-25',
      name: 'A',
      kind: 'expense',
      amount: 3000,
      ruleId,
      ruleMonth: '2026-11',
    })
    expect(result.dateChanged).toBe(true)
  })

  it('addon ソースを拒否する', () => {
    const result = computeReparentToRuleAddon({
      source: tx({ id: 's1', addon: true, amountBreakdown: [{ amount: 1 }, { amount: 2 }] }),
      target: { ruleId, ruleMonth: '2026-11', date: '2026-11-25' },
      index: 0,
      expectedAmount: 1,
      anchorDate,
      horizonEnd,
      targetMonthHasOverride: false,
    })
    expect(result).toEqual({ error: '上乗せの内訳は移動できません' })
  })

  it('確定済み月を拒否する', () => {
    const result = computeReparentToRuleAddon({
      source: tx({
        id: 's1',
        amountBreakdown: [{ amount: 3, label: 'x' }, { amount: 7 }],
      }),
      target: { ruleId, ruleMonth: '2026-11', date: '2026-11-25' },
      index: 0,
      expectedAmount: 3,
      expectedLabel: 'x',
      anchorDate,
      horizonEnd,
      targetMonthHasOverride: true,
    })
    expect(result).toEqual({ error: 'この月は確定済みです。確定した取引の内訳へ移動してください' })
  })

  it('Undo で行を戻せる', () => {
    const moved = { amount: 3000, label: 'A' }
    const after = computeReparentToRuleAddon({
      source: tx({
        id: 's1',
        amount: 5000,
        amountBreakdown: [{ amount: 3000, label: 'A' }, { amount: 2000 }],
      }),
      target: { ruleId, ruleMonth: '2026-11', date: '2026-11-25' },
      index: 0,
      expectedAmount: 3000,
      expectedLabel: 'A',
      anchorDate,
      horizonEnd,
      targetMonthHasOverride: false,
    })
    expect('error' in after).toBe(false)
    if ('error' in after) return

    const restored = computeUndoReparentToRuleAddon({
      source: { ...tx({ id: 's1' }), ...after.source },
      index: 0,
      line: moved,
    })
    expect(restored).toEqual({
      amount: 5000,
      amountBreakdown: [{ amount: 3000, label: 'A' }, { amount: 2000 }],
    })
  })
})

describe('addonNameFromLine', () => {
  it('ラベル優先', () => {
    expect(addonNameFromLine({ amount: 100, label: '光熱費' })).toBe('光熱費')
    expect(addonNameFromLine({ amount: 100 })).toBe('上乗せ')
  })
})

describe('forecast 最終残高', () => {
  it('内訳を addon へ寄せても最終残高は不変（再配分のみ）', () => {
    const rules: Doc<'rules'>[] = [
      {
        _id: ruleId,
        _creationTime: 0,
        userId,
        name: '家賃',
        kind: 'expense',
        amount: 130_000,
        dayOfMonth: 25,
      },
    ]
    const transactions: Doc<'transactions'>[] = [
      {
        _id: 'tx-manual' as Id<'transactions'>,
        _creationTime: 1,
        userId,
        date: '2026-04-10',
        name: 'カード',
        kind: 'expense',
        amount: 24_000,
        amountBreakdown: [
          { amount: 20_000, label: '生活' },
          { amount: 4_000, label: '繰越' },
        ],
      },
    ]

    const before = buildForecast({
      anchorDate,
      anchorBalance: 500_000,
      threshold: 50_000,
      rules,
      transactions,
      horizonEnd,
    })
    const beforeFinal = before[before.length - 1]!.balance

    const line = transactions[0]!.amountBreakdown![1]!
    const reparent = computeReparentToRuleAddon({
      source: {
        id: transactions[0]!._id,
        kind: 'expense',
        amount: transactions[0]!.amount,
        amountBreakdown: transactions[0]!.amountBreakdown,
        date: transactions[0]!.date,
      },
      target: { ruleId, ruleMonth: '2026-11', date: '2026-11-25' },
      index: 1,
      expectedAmount: line.amount,
      expectedLabel: line.label,
      anchorDate,
      horizonEnd,
      targetMonthHasOverride: false,
    })
    expect('error' in reparent).toBe(false)
    if ('error' in reparent) return

    const sourceAfter = {
      ...transactions[0]!,
      amount: reparent.source.amount,
      amountBreakdown: reparent.source.amountBreakdown,
    }
    const addonTx: Doc<'transactions'> = {
      _id: 'tx-addon' as Id<'transactions'>,
      _creationTime: 2,
      userId,
      date: reparent.addon.date,
      name: reparent.addon.name,
      kind: reparent.addon.kind,
      amount: reparent.addon.amount,
      ruleId: ruleId,
      ruleMonth: reparent.addon.ruleMonth,
      addon: true,
    }

    const after = buildForecast({
      anchorDate,
      anchorBalance: 500_000,
      threshold: 50_000,
      rules,
      transactions: [sourceAfter, addonTx],
      horizonEnd,
    })
    const afterFinal = after[after.length - 1]!.balance
    expect(afterFinal).toBe(beforeFinal)
  })
})