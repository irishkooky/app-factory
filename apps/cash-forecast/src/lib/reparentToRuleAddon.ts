/**
 * 内訳1行を未確定ルール月へ addon として移動する純ロジック。
 */

import {
  isHistorySide,
  isListReachableTarget,
  labelsEqual,
  materializeBreakdown,
  normalizePersistedBreakdown,
  type BreakdownEntry,
  type ReparentTxSnapshot,
} from "./reparentBreakdown";

export type ReparentToRuleAddonTarget = {
  ruleId: string;
  ruleMonth: string;
  /** ルール発生日（仮想行の date） */
  date: string;
};

export type ReparentToRuleAddonInput = {
  source: ReparentTxSnapshot;
  target: ReparentToRuleAddonTarget;
  index: number;
  expectedAmount: number;
  expectedLabel?: string;
  anchorDate: string;
  horizonEnd: string;
  /** 同一 ruleMonth に override（非 addon）が既にある */
  targetMonthHasOverride: boolean;
};

export type ReparentToRuleAddonOk = {
  source: { amount: number; amountBreakdown: BreakdownEntry[] | undefined };
  addon: {
    date: string;
    name: string;
    kind: "income" | "expense";
    amount: number;
    ruleId: string;
    ruleMonth: string;
  };
  moved: BreakdownEntry;
  dateChanged: boolean;
  undo: {
    sourceId: string;
    sourceIndex: number;
    expectedAmount: number;
    expectedLabel?: string;
    addonId?: string;
  };
};

export type ReparentToRuleAddonResult = ReparentToRuleAddonOk | { error: string };

export function addonNameFromLine(line: BreakdownEntry): string {
  const label = line.label?.trim();
  if (label !== undefined && label.length > 0) return label;
  return "上乗せ";
}

export function computeReparentToRuleAddon(input: ReparentToRuleAddonInput): ReparentToRuleAddonResult {
  const {
    source,
    target,
    index,
    expectedAmount,
    expectedLabel,
    anchorDate,
    horizonEnd,
    targetMonthHasOverride,
  } = input;

  if (source.addon === true) {
    return { error: "上乗せの内訳は移動できません" };
  }
  if (source.importBatchId !== undefined) {
    return { error: "PDF取込の取引からは移動できません" };
  }

  const sourceSide = isHistorySide(source.date, anchorDate, source.actual) ? "history" : "forecast";
  if (sourceSide !== "forecast") {
    return { error: "履歴と予定のあいだでは移動できません" };
  }

  if (targetMonthHasOverride) {
    return { error: "この月は確定済みです。確定した取引の内訳へ移動してください" };
  }

  if (!isListReachableTarget({ date: target.date, addon: undefined, importBatchId: undefined }, anchorDate, horizonEnd)) {
    return { error: "移動先のルール月が予測一覧にありません" };
  }

  const sourceLines = materializeBreakdown(source);
  if (sourceLines.length < 2) {
    return { error: "内訳が2行以上のときだけ移動できます" };
  }
  if (index < 0 || index >= sourceLines.length) {
    return { error: "内訳の行が見つかりません" };
  }

  const line = sourceLines[index]!;
  if (line.amount !== expectedAmount || !labelsEqual(line.label, expectedLabel)) {
    return { error: "内訳の内容が変わっています。画面を開き直してください" };
  }

  const remaining = [...sourceLines.slice(0, index), ...sourceLines.slice(index + 1)];
  if (remaining.length < 1) {
    return { error: "最後の1行は移動できません" };
  }

  const moved: BreakdownEntry =
    line.label !== undefined && line.label !== ""
      ? { amount: line.amount, label: line.label }
      : { amount: line.amount };

  const nextSource = normalizePersistedBreakdown(remaining);

  return {
    source: nextSource,
    addon: {
      date: target.date,
      name: addonNameFromLine(moved),
      kind: source.kind,
      amount: moved.amount,
      ruleId: target.ruleId,
      ruleMonth: target.ruleMonth,
    },
    moved,
    dateChanged: source.date !== target.date,
    undo: {
      sourceId: source.id,
      sourceIndex: index,
      expectedAmount: moved.amount,
      ...(moved.label !== undefined ? { expectedLabel: moved.label } : {}),
    },
  };
}

/** addon 取り消し: 行をソース内訳の元 index に戻す */
export function computeUndoReparentToRuleAddon(input: {
  source: ReparentTxSnapshot;
  index: number;
  line: BreakdownEntry;
}): { amount: number; amountBreakdown: BreakdownEntry[] | undefined } {
  const lines = materializeBreakdown(input.source);
  const clampedIndex = Math.max(0, Math.min(input.index, lines.length));
  const nextLines = [...lines.slice(0, clampedIndex), input.line, ...lines.slice(clampedIndex)];
  return normalizePersistedBreakdown(nextLines);
}