export type AmountLine = {
  id: string
  value: number | undefined
  /** Optional memo for this line. Empty string means none. */
  label: string
}

/** Persisted breakdown entry. Omit `label` when empty. */
export type AmountBreakdownEntry = {
  amount: number
  label?: string
}

let lineSeq = 0

/** Stable unique id for a form row (DOM key + remove target). */
export function createAmountLine(value?: number, label = ''): AmountLine {
  lineSeq += 1
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `amount-line-${lineSeq}`
  return { id, value, label }
}

/** Edit/create seed: always exactly one row. */
export function initAmountLines(amount: number | undefined): AmountLine[] {
  return [createAmountLine(amount)]
}

/**
 * Hydrate form lines from a transaction. Prefer non-empty amountBreakdown;
 * missing or [] means a single row from amount.
 */
export function initAmountLinesFromTx(tx: {
  amount: number | undefined
  amountBreakdown?: AmountBreakdownEntry[] | undefined
}): AmountLine[] {
  const breakdown = tx.amountBreakdown
  if (breakdown !== undefined && breakdown.length > 0) {
    return breakdown.map((entry) => createAmountLine(entry.amount, entry.label ?? ''))
  }
  return initAmountLines(tx.amount)
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

/**
 * Persist shape for create/update. Defined-value lines only; trim labels;
 * omit empty label keys. Undefined when nothing to store (no values, or a
 * single unlabeled line — scalar amount is enough).
 */
export function toAmountBreakdown(lines: AmountLine[]): AmountBreakdownEntry[] | undefined {
  const entries: AmountBreakdownEntry[] = []
  for (const line of lines) {
    if (line.value === undefined) continue
    const trimmed = line.label.trim()
    if (trimmed.length > 0) {
      entries.push({ amount: line.value, label: trimmed })
    } else {
      entries.push({ amount: line.value })
    }
  }
  if (entries.length === 0) return undefined
  if (entries.length === 1 && entries[0]!.label === undefined) return undefined
  return entries
}
