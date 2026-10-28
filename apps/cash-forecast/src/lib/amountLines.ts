export type AmountLine = {
  id: string
  value: number | undefined
}

let lineSeq = 0

/** Stable unique id for a form row (DOM key + remove target). */
export function createAmountLine(value?: number): AmountLine {
  lineSeq += 1
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `amount-line-${lineSeq}`
  return { id, value }
}

/** Edit/create seed: always exactly one row. */
export function initAmountLines(amount: number | undefined): AmountLine[] {
  return [createAmountLine(amount)]
}

/**
 * Sum defined line values. Returns undefined when every line is empty so submit
 * can reuse the same "金額を入力してください" validation as a single MoneyField.
 */
export function sumAmountLines(lines: AmountLine[]): number | undefined {
  let total = 0
  let saw = false
  for (const line of lines) {
    if (line.value === undefined) continue
    saw = true
    total += line.value
  }
  return saw ? total : undefined
}
