import { describe, expect, it } from 'vitest'
import {
  computeReparent,
  isEligibleReparentTarget,
  isListReachableTarget,
  labelsEqual,
  materializeBreakdown,
  normalizePersistedBreakdown,
  type ReparentTxSnapshot,
} from './reparentBreakdown'

const anchorDate = '2026-03-15'
const horizonEnd = '2027-03-15'

function tx(partial: Partial<ReparentTxSnapshot> & Pick<ReparentTxSnapshot, 'id'>): ReparentTxSnapshot {
  return {
    kind: 'expense',
    amount: 10000,
    date: '2026-04-01',
    ...partial,
  }
}

describe('labelsEqual', () => {
  it('空文字と undefined を同一視する', () => {
    expect(labelsEqual(undefined, undefined)).toBe(true)
    expect(labelsEqual('', undefined)).toBe(true)
    expect(labelsEqual(undefined, '')).toBe(true)
    expect(labelsEqual('家賃', '家賃')).toBe(true)
    expect(labelsEqual('家賃', undefined)).toBe(false)
  })
})

describe('materializeBreakdown / normalizePersistedBreakdown', () => {
  it('スカラー親を1行化する', () => {
    expect(materializeBreakdown({ amount: 5000 })).toEqual([{ amount: 5000 }])
  })

  it('ラベル無し1行はスカラーへ畳む', () => {
    expect(normalizePersistedBreakdown([{ amount: 3000 }])).toEqual({
      amount: 3000,
      amountBreakdown: undefined,
    })
  })

  it('複数行は合計を amount にする', () => {
    expect(
      normalizePersistedBreakdown([
        { amount: 2000, label: 'A' },
        { amount: 3000 },
      ]),
    ).toEqual({
      amount: 5000,
      amountBreakdown: [{ amount: 2000, label: 'A' }, { amount: 3000 }],
    })
  })
})

describe('isListReachableTarget / isEligibleReparentTarget', () => {
  it('地平線外・addon・import を弾く', () => {
    expect(
      isListReachableTarget(
        { date: '2028-01-01', addon: undefined, importBatchId: undefined },
        anchorDate,
        horizonEnd,
      ),
    ).toBe(false)
    expect(
      isListReachableTarget(
        { date: '2026-04-01', addon: true, importBatchId: undefined },
        anchorDate,
        horizonEnd,
      ),
    ).toBe(false)
    expect(
      isListReachableTarget(
        { date: '2026-04-01', addon: undefined, importBatchId: 'batch-1' },
        anchorDate,
        horizonEnd,
      ),
    ).toBe(false)
  })

  it('異 kind・履歴↔予定を弾く', () => {
    const source = tx({ id: 's', kind: 'expense', date: '2026-04-01' })
    expect(
      isEligibleReparentTarget(
        source,
        tx({ id: 't', kind: 'income', date: '2026-05-01' }),
        anchorDate,
        horizonEnd,
      ),
    ).toBe(false)
    expect(
      isEligibleReparentTarget(
        source,
        tx({ id: 't', kind: 'expense', date: '2026-03-01' }),
        anchorDate,
        horizonEnd,
      ),
    ).toBe(false)
  })
})

describe('computeReparent — interrogate 失敗ケースの回帰', () => {
  const sourceWithBreakdown = tx({
    id: 'src',
    amount: 10000,
    amountBreakdown: [
      { amount: 6000, label: '本体' },
      { amount: 4000, label: '手数料' },
    ],
    date: '2026-04-10',
  })

  it('正常系: 同 kind・同側・日付違いでも移動でき、両親の amount が内訳合計になる', () => {
    const target = tx({
      id: 'dst',
      amount: 2000,
      date: '2026-05-01',
    })
    const result = computeReparent({
      source: sourceWithBreakdown,
      target,
      index: 1,
      expectedAmount: 4000,
      expectedLabel: '手数料',
      anchorDate,
      horizonEnd,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.source.amount).toBe(6000)
    expect(result.source.amountBreakdown).toEqual([{ amount: 6000, label: '本体' }])
    expect(result.target.amount).toBe(6000)
    expect(result.target.amountBreakdown).toEqual([
      { amount: 2000 },
      { amount: 4000, label: '手数料' },
    ])
    expect(result.dateChanged).toBe(true)
    expect(result.undo).toEqual({
      sourceId: 'dst',
      targetId: 'src',
      index: 1,
      expectedAmount: 4000,
      expectedLabel: '手数料',
    })
  })

  it('異 kind は拒否（最終残高 2×ずれ防止）', () => {
    const result = computeReparent({
      source: sourceWithBreakdown,
      target: tx({ id: 'dst', kind: 'income', amount: 1000, date: '2026-05-01' }),
      index: 0,
      expectedAmount: 6000,
      expectedLabel: '本体',
      anchorDate,
      horizonEnd,
    })
    expect(result).toEqual({ error: '収入と支出のあいだでは移動できません' })
  })

  it('履歴 ↔ 予定は拒否（二重計上／架空残高防止）', () => {
    const result = computeReparent({
      source: sourceWithBreakdown,
      target: tx({ id: 'dst', amount: 1000, date: '2026-03-01' }),
      index: 0,
      expectedAmount: 6000,
      expectedLabel: '本体',
      anchorDate,
      horizonEnd,
    })
    expect(result).toEqual({ error: '履歴と予定のあいだでは移動できません' })
  })

  it('地平線外の不可視ターゲットは拒否', () => {
    const result = computeReparent({
      source: sourceWithBreakdown,
      target: tx({ id: 'dst', amount: 1000, date: '2028-06-01' }),
      index: 0,
      expectedAmount: 6000,
      expectedLabel: '本体',
      anchorDate,
      horizonEnd,
    })
    expect(result).toEqual({ error: '移動先の取引が一覧にありません' })
  })

  it('addon はソース／ターゲットとも拒否', () => {
    expect(
      computeReparent({
        source: { ...sourceWithBreakdown, addon: true },
        target: tx({ id: 'dst', amount: 1000, date: '2026-05-01' }),
        index: 0,
        expectedAmount: 6000,
        expectedLabel: '本体',
        anchorDate,
        horizonEnd,
      }),
    ).toEqual({ error: '上乗せの内訳は移動できません' })

    expect(
      computeReparent({
        source: sourceWithBreakdown,
        target: tx({ id: 'dst', amount: 1000, date: '2026-05-01', addon: true }),
        index: 0,
        expectedAmount: 6000,
        expectedLabel: '本体',
        anchorDate,
        horizonEnd,
      }),
    ).toEqual({ error: '上乗せには移動できません' })
  })

  it('importBatchId 付きは移動先から拒否', () => {
    const result = computeReparent({
      source: sourceWithBreakdown,
      target: tx({
        id: 'dst',
        amount: 1000,
        date: '2026-05-01',
        importBatchId: 'imp-1',
      }),
      index: 0,
      expectedAmount: 6000,
      expectedLabel: '本体',
      anchorDate,
      horizonEnd,
    })
    expect(result).toEqual({ error: 'PDF取込の取引には移動できません' })
  })

  it('内訳1行（最後の1行）は移動不可', () => {
    const result = computeReparent({
      source: tx({
        id: 'src',
        amount: 5000,
        amountBreakdown: [{ amount: 5000, label: 'のみ' }],
        date: '2026-04-10',
      }),
      target: tx({ id: 'dst', amount: 1000, date: '2026-05-01' }),
      index: 0,
      expectedAmount: 5000,
      expectedLabel: 'のみ',
      anchorDate,
      horizonEnd,
    })
    expect(result).toEqual({ error: '内訳が2行以上のときだけ移動できます' })
  })

  it('index + 期待 amount/label 不一致は拒否（ずれで別行が動くのを防ぐ）', () => {
    expect(
      computeReparent({
        source: sourceWithBreakdown,
        target: tx({ id: 'dst', amount: 1000, date: '2026-05-01' }),
        index: 0,
        expectedAmount: 9999,
        expectedLabel: '本体',
        anchorDate,
        horizonEnd,
      }),
    ).toEqual({ error: '内訳の内容が変わっています。画面を開き直してください' })

    expect(
      computeReparent({
        source: sourceWithBreakdown,
        target: tx({ id: 'dst', amount: 1000, date: '2026-05-01' }),
        index: 0,
        expectedAmount: 6000,
        expectedLabel: '別物',
        anchorDate,
        horizonEnd,
      }),
    ).toEqual({ error: '内訳の内容が変わっています。画面を開き直してください' })

    expect(
      computeReparent({
        source: sourceWithBreakdown,
        target: tx({ id: 'dst', amount: 1000, date: '2026-05-01' }),
        index: 9,
        expectedAmount: 6000,
        expectedLabel: '本体',
        anchorDate,
        horizonEnd,
      }),
    ).toEqual({ error: '内訳の行が見つかりません' })
  })

  it('スカラー先親は既存 amount を1行化してから追記する', () => {
    const result = computeReparent({
      source: sourceWithBreakdown,
      target: tx({ id: 'dst', amount: 7000, date: '2026-04-10' }),
      index: 0,
      expectedAmount: 6000,
      expectedLabel: '本体',
      anchorDate,
      horizonEnd,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.target.amountBreakdown).toEqual([
      { amount: 7000 },
      { amount: 6000, label: '本体' },
    ])
    expect(result.target.amount).toBe(13000)
    expect(result.source.amount).toBe(4000)
    expect(result.source.amountBreakdown).toEqual([{ amount: 4000, label: '手数料' }])
  })

  it('移動後ソースがラベル無し1行ならスカラーへ畳む', () => {
    const result = computeReparent({
      source: tx({
        id: 'src',
        amount: 9000,
        amountBreakdown: [{ amount: 5000 }, { amount: 4000, label: '移す' }],
        date: '2026-04-10',
      }),
      target: tx({
        id: 'dst',
        amount: 1000,
        amountBreakdown: [{ amount: 1000, label: '既存' }],
        date: '2026-04-10',
      }),
      index: 1,
      expectedAmount: 4000,
      expectedLabel: '移す',
      anchorDate,
      horizonEnd,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.source).toEqual({ amount: 5000, amountBreakdown: undefined })
    expect(result.target.amount).toBe(5000)
  })

  it('Undo 情報で逆 patch すると元に戻る', () => {
    const target = tx({
      id: 'dst',
      amount: 1000,
      amountBreakdown: [{ amount: 1000, label: '先' }],
      date: '2026-04-10',
    })
    const forward = computeReparent({
      source: sourceWithBreakdown,
      target,
      index: 1,
      expectedAmount: 4000,
      expectedLabel: '手数料',
      anchorDate,
      horizonEnd,
    })
    expect('error' in forward).toBe(false)
    if ('error' in forward) return

    const afterSource = {
      ...sourceWithBreakdown,
      amount: forward.source.amount,
      amountBreakdown: forward.source.amountBreakdown,
    }
    const afterTarget = {
      ...target,
      amount: forward.target.amount,
      amountBreakdown: forward.target.amountBreakdown,
    }

    const back = computeReparent({
      source: { ...afterTarget, id: forward.undo.sourceId },
      target: { ...afterSource, id: forward.undo.targetId },
      index: forward.undo.index,
      expectedAmount: forward.undo.expectedAmount,
      expectedLabel: forward.undo.expectedLabel,
      anchorDate,
      horizonEnd,
    })
    expect('error' in back).toBe(false)
    if ('error' in back) return
    expect(back.source.amount).toBe(1000)
    expect(back.source.amountBreakdown).toEqual([{ amount: 1000, label: '先' }])
    expect(back.target.amount).toBe(10000)
    expect(back.target.amountBreakdown).toEqual([
      { amount: 6000, label: '本体' },
      { amount: 4000, label: '手数料' },
    ])
  })
})
