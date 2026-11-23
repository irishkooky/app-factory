/**
 * 内訳行の親付け替え（reparent）の純ロジック。
 * Convex mutation とユニットテストの両方から使う。スキーマは触らない。
 */

export type BreakdownEntry = {
  amount: number
  label?: string
}

export type ReparentTxSnapshot = {
  id: string
  kind: "income" | "expense"
  amount: number
  amountBreakdown?: BreakdownEntry[]
  date: string
  addon?: boolean
  actual?: boolean
  importBatchId?: string
}

export type ReparentComputeInput = {
  source: ReparentTxSnapshot
  target: ReparentTxSnapshot
  index: number
  expectedAmount: number
  expectedLabel?: string
  anchorDate: string
  /** 予測一覧の地平線。forecast 側の移動先は date <= horizonEnd が必須 */
  horizonEnd: string
}

export type ReparentComputeOk = {
  source: { amount: number; amountBreakdown: BreakdownEntry[] | undefined }
  target: { amount: number; amountBreakdown: BreakdownEntry[] | undefined }
  moved: BreakdownEntry
  /** 移動後、先親の内訳における index（Undo 用） */
  targetIndex: number
  dateChanged: boolean
  undo: {
    sourceId: string
    targetId: string
    index: number
    expectedAmount: number
    expectedLabel?: string
  }
}

export type ReparentComputeResult = ReparentComputeOk | { error: string }

/** 空文字・欠落を同じ「ラベル無し」として扱う */
export function labelsEqual(a: string | undefined, b: string | undefined): boolean {
  const left = a === undefined || a === "" ? undefined : a
  const right = b === undefined || b === "" ? undefined : b
  return left === right
}

export function isHistorySide(date: string, anchorDate: string, actual?: boolean): boolean {
  return actual === true || date <= anchorDate
}

/** 一覧から開ける実取引か（仮想は id 無しなのでここまで来ない） */
export function isListReachableTarget(
  tx: Pick<ReparentTxSnapshot, "date" | "actual" | "addon" | "importBatchId">,
  anchorDate: string,
  horizonEnd: string,
): boolean {
  if (tx.addon === true) return false
  if (tx.importBatchId !== undefined) return false
  if (isHistorySide(tx.date, anchorDate, tx.actual)) {
    return true
  }
  return tx.date > anchorDate && tx.date <= horizonEnd
}

/**
 * 内訳が無ければスカラー amount を1行化する。
 * 空配列も「内訳なし」扱い。
 */
export function materializeBreakdown(tx: {
  amount: number
  amountBreakdown?: BreakdownEntry[]
}): BreakdownEntry[] {
  const breakdown = tx.amountBreakdown
  if (breakdown !== undefined && breakdown.length > 0) {
    return breakdown.map((entry) =>
      entry.label !== undefined && entry.label !== ""
        ? { amount: entry.amount, label: entry.label }
        : { amount: entry.amount },
    )
  }
  return [{ amount: tx.amount }]
}

/**
 * 保存形に正規化。ラベル無し1行はスカラーへ畳む（フォーム保存と同じ）。
 * 合計は丸めて amount に合わせる。
 */
export function normalizePersistedBreakdown(
  breakdown: BreakdownEntry[],
): { amount: number; amountBreakdown: BreakdownEntry[] | undefined } {
  if (breakdown.length === 0) {
    throw new Error("内訳が空です")
  }
  const cleaned = breakdown.map((entry) =>
    entry.label !== undefined && entry.label !== ""
      ? { amount: entry.amount, label: entry.label }
      : { amount: entry.amount },
  )
  const amount = Math.round(cleaned.reduce((sum, entry) => sum + entry.amount, 0))
  if (cleaned.length === 1 && cleaned[0]!.label === undefined) {
    return { amount, amountBreakdown: undefined }
  }
  return { amount, amountBreakdown: cleaned }
}

/**
 * 両親の新しい amount / amountBreakdown を計算する。制約違反は { error }。
 */
export function computeReparent(input: ReparentComputeInput): ReparentComputeResult {
  const { source, target, index, expectedAmount, expectedLabel, anchorDate, horizonEnd } = input

  if (source.id === target.id) {
    return { error: "同じ取引には移動できません" }
  }
  if (source.addon === true) {
    return { error: "上乗せの内訳は移動できません" }
  }
  if (target.addon === true) {
    return { error: "上乗せには移動できません" }
  }
  if (target.importBatchId !== undefined) {
    return { error: "PDF取込の取引には移動できません" }
  }
  if (source.kind !== target.kind) {
    return { error: "収入と支出のあいだでは移動できません" }
  }

  const sourceSide = isHistorySide(source.date, anchorDate, source.actual) ? "history" : "forecast"
  const targetSide = isHistorySide(target.date, anchorDate, target.actual) ? "history" : "forecast"
  if (sourceSide !== targetSide) {
    return { error: "履歴と予定のあいだでは移動できません" }
  }
  if (!isListReachableTarget(target, anchorDate, horizonEnd)) {
    return { error: "移動先の取引が一覧にありません" }
  }

  const sourceLines = materializeBreakdown(source)
  if (sourceLines.length < 2) {
    return { error: "内訳が2行以上のときだけ移動できます" }
  }
  if (index < 0 || index >= sourceLines.length) {
    return { error: "内訳の行が見つかりません" }
  }

  const line = sourceLines[index]!
  if (line.amount !== expectedAmount || !labelsEqual(line.label, expectedLabel)) {
    return { error: "内訳の内容が変わっています。画面を開き直してください" }
  }

  const remaining = [...sourceLines.slice(0, index), ...sourceLines.slice(index + 1)]
  if (remaining.length < 1) {
    return { error: "最後の1行は移動できません" }
  }

  const moved: BreakdownEntry =
    line.label !== undefined && line.label !== ""
      ? { amount: line.amount, label: line.label }
      : { amount: line.amount }

  const targetLines = materializeBreakdown(target)
  const nextTargetLines = [...targetLines, moved]
  const targetIndex = nextTargetLines.length - 1

  const nextSource = normalizePersistedBreakdown(remaining)
  const nextTarget = normalizePersistedBreakdown(nextTargetLines)

  return {
    source: nextSource,
    target: nextTarget,
    moved,
    targetIndex,
    dateChanged: source.date !== target.date,
    undo: {
      sourceId: target.id,
      targetId: source.id,
      index: targetIndex,
      expectedAmount: moved.amount,
      ...(moved.label !== undefined ? { expectedLabel: moved.label } : {}),
    },
  }
}

/** ピッカー用: 同じ kind・同じ側・一覧到達可・非 addon・非 import */
export function isEligibleReparentTarget(
  source: Pick<ReparentTxSnapshot, "id" | "kind" | "date" | "actual" | "addon">,
  candidate: Pick<
    ReparentTxSnapshot,
    "id" | "kind" | "date" | "actual" | "addon" | "importBatchId"
  >,
  anchorDate: string,
  horizonEnd: string,
): boolean {
  if (candidate.id === source.id) return false
  if (candidate.kind !== source.kind) return false
  if (source.addon === true || candidate.addon === true) return false
  if (candidate.importBatchId !== undefined) return false
  const sourceSide = isHistorySide(source.date, anchorDate, source.actual) ? "history" : "forecast"
  const candidateSide = isHistorySide(candidate.date, anchorDate, candidate.actual)
    ? "history"
    : "forecast"
  if (sourceSide !== candidateSide) return false
  return isListReachableTarget(candidate, anchorDate, horizonEnd)
}
