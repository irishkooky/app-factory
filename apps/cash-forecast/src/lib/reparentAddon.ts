/**
 * ルール月上乗せ（addon）行を別の取引／未確定ルール月へ移動する純ロジック。
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

export type ReparentAddonToRuleMonthTarget = {
  ruleId: string;
  ruleMonth: string;
  date: string;
};

export type ReparentAddonToTransactionInput = {
  addon: ReparentTxSnapshot;
  target: ReparentTxSnapshot;
  expectedAmount: number;
  expectedLabel?: string;
  anchorDate: string;
  horizonEnd: string;
};

export type ReparentAddonToRuleMonthInput = {
  addon: ReparentTxSnapshot & { ruleId: string; ruleMonth: string };
  target: ReparentAddonToRuleMonthTarget;
  expectedAmount: number;
  expectedLabel?: string;
  anchorDate: string;
  horizonEnd: string;
  targetMonthHasOverride: boolean;
};

export type ReparentAddonToTransactionOk = {
  target: { amount: number; amountBreakdown: BreakdownEntry[] | undefined };
  line: BreakdownEntry;
  targetIndex: number;
  dateChanged: boolean;
};

export type ReparentAddonToRuleMonthOk = {
  patch: { ruleId: string; ruleMonth: string; date: string };
  dateChanged: boolean;
};

export type ReparentAddonResult<T> = T | { error: string };

function addonLineFromAmount(expectedAmount: number, expectedLabel?: string): BreakdownEntry {
  const rawLabel = expectedLabel?.trim() ?? "";
  if (rawLabel.length > 0) {
    return { amount: expectedAmount, label: rawLabel };
  }
  return { amount: expectedAmount };
}

function validateAddonSource(addon: ReparentTxSnapshot, anchorDate: string, horizonEnd: string): string | undefined {
  if (addon.addon !== true) {
    return "上乗せ行だけ移動できます";
  }
  if (addon.importBatchId !== undefined) {
    return "PDF取込の取引からは移動できません";
  }
  if (isHistorySide(addon.date, anchorDate, addon.actual)) {
    return "履歴と予定のあいだでは移動できません";
  }
  if (!(addon.date > anchorDate && addon.date <= horizonEnd)) {
    return "移動元の上乗せが一覧にありません";
  }
  return undefined;
}

export function computeReparentAddonToTransaction(
  input: ReparentAddonToTransactionInput,
): ReparentAddonResult<ReparentAddonToTransactionOk> {
  const { addon, target, expectedAmount, expectedLabel, anchorDate, horizonEnd } = input;

  const sourceErr = validateAddonSource(addon, anchorDate, horizonEnd);
  if (sourceErr !== undefined) return { error: sourceErr };

  if (target.addon === true) {
    return { error: "上乗せには移動できません" };
  }
  if (target.importBatchId !== undefined) {
    return { error: "PDF取込の取引には移動できません" };
  }
  if (addon.kind !== target.kind) {
    return { error: "収入と支出のあいだでは移動できません" };
  }
  if (addon.id === target.id) {
    return { error: "同じ取引には移動できません" };
  }

  const targetSide = isHistorySide(target.date, anchorDate, target.actual) ? "history" : "forecast";
  const sourceSide = isHistorySide(addon.date, anchorDate, addon.actual) ? "history" : "forecast";
  if (sourceSide !== targetSide) {
    return { error: "履歴と予定のあいだでは移動できません" };
  }
  if (!isListReachableTarget(target, anchorDate, horizonEnd)) {
    return { error: "移動先の取引が一覧にありません" };
  }

  if (addon.amount !== expectedAmount) {
    return { error: "移動した内容が変わっています。画面を開き直してください" };
  }

  const line = addonLineFromAmount(expectedAmount, expectedLabel);

  const targetLines = materializeBreakdown(target);
  const nextTargetLines = [...targetLines, line];
  const targetIndex = nextTargetLines.length - 1;
  const nextTarget = normalizePersistedBreakdown(nextTargetLines);

  return {
    target: nextTarget,
    line,
    targetIndex,
    dateChanged: addon.date !== target.date,
  };
}

export function computeReparentAddonToRuleMonth(
  input: ReparentAddonToRuleMonthInput,
): ReparentAddonResult<ReparentAddonToRuleMonthOk> {
  const { addon, target, expectedAmount, anchorDate, horizonEnd, targetMonthHasOverride } = input;

  const sourceErr = validateAddonSource(addon, anchorDate, horizonEnd);
  if (sourceErr !== undefined) return { error: sourceErr };

  if (addon.amount !== expectedAmount) {
    return { error: "移動した内容が変わっています。画面を開き直してください" };
  }

  if (addon.ruleId === target.ruleId && addon.ruleMonth === target.ruleMonth) {
    return { error: "同じルール月には移動できません" };
  }

  if (targetMonthHasOverride) {
    return { error: "この月は確定済みです。確定した取引の内訳へ移動してください" };
  }

  if (
    !isListReachableTarget({ date: target.date, addon: undefined, importBatchId: undefined }, anchorDate, horizonEnd)
  ) {
    return { error: "移動先のルール月が予測一覧にありません" };
  }

  return {
    patch: { ruleId: target.ruleId, ruleMonth: target.ruleMonth, date: target.date },
    dateChanged: addon.date !== target.date,
  };
}

/** addon 行ラベル検証（DB の name と expectedLabel） */
export function addonLabelMatches(addonName: string, expectedLabel?: string): boolean {
  const expected = expectedLabel?.trim() ?? "";
  if (expected.length === 0) return true;
  return labelsEqual(addonName.trim(), expected);
}