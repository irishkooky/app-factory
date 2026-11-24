/**
 * Playwright スクショハーネスとテストで共有するシナリオ。
 * 手書きの after 状態は作らず computeReparentToRuleAddon → buildForecast で導出する。
 */

import type { Doc, Id } from "../../convex/_generated/dataModel";
import { clampedDateInMonth } from "./date";
import { buildForecast, type ForecastRow } from "./forecast";
import { buildForecastReparentCandidates, type ReparentCandidate } from "./reparentCandidates";
import {
  computeReparentToRuleAddon,
  type ReparentToRuleAddonOk,
} from "./reparentToRuleAddon";

export const HARNESS_ANCHOR_DATE = "2026-03-15";
export const HARNESS_HORIZON_END = "2027-03-15";
export const HARNESS_SOURCE_DATE = "2026-04-10";
export const HARNESS_TARGET_RULE_MONTH = "2026-11";
export const HARNESS_MOVED_LINE_INDEX = 1;
export const HARNESS_MOVED_AMOUNT = 4_000;
export const HARNESS_MOVED_LABEL = "繰越分";

const userId = "harness-user";
export const HARNESS_RULE_RENT_ID = "rule_rent" as Id<"rules">;
const ruleRentId = HARNESS_RULE_RENT_ID;
const ruleCardId = "rule_card" as Id<"rules">;
const txManualId = "tx_manual" as Id<"transactions">;

export const harnessRules: Doc<"rules">[] = [
  {
    _id: ruleRentId,
    _creationTime: 0,
    userId,
    name: "家賃",
    kind: "expense",
    amount: 130_000,
    dayOfMonth: 25,
  },
  {
    _id: ruleCardId,
    _creationTime: 0,
    userId,
    name: "カード引き落とし",
    kind: "expense",
    amount: 45_000,
    dayOfMonth: 10,
  },
];

function harnessTransactionsBefore(): Doc<"transactions">[] {
  return [
    {
      _id: txManualId,
      _creationTime: 1,
      userId,
      date: HARNESS_SOURCE_DATE,
      name: "4月の支出",
      kind: "expense",
      amount: 54_000,
      amountBreakdown: [
        { amount: 50_000, label: "生活費" },
        { amount: HARNESS_MOVED_AMOUNT, label: HARNESS_MOVED_LABEL },
      ],
    },
    {
      _id: "tx_grocery" as Id<"transactions">,
      _creationTime: 2,
      userId,
      date: "2026-05-01",
      name: "食料品",
      kind: "expense",
      amount: 12_000,
    },
    {
      _id: "tx_confirmed" as Id<"transactions">,
      _creationTime: 3,
      userId,
      date: "2026-06-25",
      name: "家賃（6月確定）",
      kind: "expense",
      amount: 132_000,
      ruleId: ruleRentId,
      ruleMonth: "2026-06",
    },
  ];
}

function virtualRentRow(forecast: ForecastRow[]): ForecastRow | undefined {
  return forecast.find(
    (row) =>
      row.isVirtual &&
      row.ruleId === ruleRentId &&
      row.ruleMonth === HARNESS_TARGET_RULE_MONTH,
  );
}

export type ReparentRulesHarnessScenario = {
  anchorDate: string;
  horizonEnd: string;
  rules: Doc<"rules">[];
  transactionsBefore: Doc<"transactions">[];
  transactionsAfter: Doc<"transactions">[];
  reparent: ReparentToRuleAddonOk;
  forecastBefore: ForecastRow[];
  forecastAfter: ForecastRow[];
  virtualRentBefore: ForecastRow | undefined;
  virtualRentAfter: ForecastRow | undefined;
  candidatesBefore: ReparentCandidate[];
  finalBalanceBefore: number;
  finalBalanceAfter: number;
  targetRuleDate: string;
};

export function buildReparentRulesHarnessScenario(): ReparentRulesHarnessScenario {
  const rules = harnessRules;
  const transactionsBefore = harnessTransactionsBefore();
  const sourceTx = transactionsBefore[0]!;
  const rentRule = rules.find((r) => r._id === ruleRentId)!;
  const targetRuleDate = clampedDateInMonth(HARNESS_TARGET_RULE_MONTH, rentRule.dayOfMonth);

  const reparent = computeReparentToRuleAddon({
    source: {
      id: sourceTx._id,
      kind: sourceTx.kind,
      amount: sourceTx.amount,
      amountBreakdown: sourceTx.amountBreakdown,
      date: sourceTx.date,
    },
    target: {
      ruleId: ruleRentId,
      ruleMonth: HARNESS_TARGET_RULE_MONTH,
      date: targetRuleDate,
    },
    index: HARNESS_MOVED_LINE_INDEX,
    expectedAmount: HARNESS_MOVED_AMOUNT,
    expectedLabel: HARNESS_MOVED_LABEL,
    anchorDate: HARNESS_ANCHOR_DATE,
    horizonEnd: HARNESS_HORIZON_END,
    targetMonthHasOverride: false,
  });

  if ("error" in reparent) {
    throw new Error(`harness scenario setup failed: ${reparent.error}`);
  }

  const sourceAfter: Doc<"transactions"> = {
    ...sourceTx,
    amount: reparent.source.amount,
    amountBreakdown:
      reparent.source.amountBreakdown !== undefined && reparent.source.amountBreakdown.length > 0
        ? reparent.source.amountBreakdown
        : undefined,
  };

  const addonTx: Doc<"transactions"> = {
    _id: "tx_addon" as Id<"transactions">,
    _creationTime: 4,
    userId,
    date: reparent.addon.date,
    name: reparent.addon.name,
    kind: reparent.addon.kind,
    amount: reparent.addon.amount,
    ruleId: ruleRentId,
    ruleMonth: HARNESS_TARGET_RULE_MONTH,
    addon: true,
    reparentOriginSourceId: sourceTx._id,
    reparentOriginSourceIndex: reparent.undo.sourceIndex,
  };

  const transactionsAfter = [sourceAfter, ...transactionsBefore.slice(1), addonTx];

  const forecastBefore = buildForecast({
    anchorDate: HARNESS_ANCHOR_DATE,
    anchorBalance: 500_000,
    threshold: 50_000,
    rules,
    transactions: transactionsBefore,
    horizonEnd: HARNESS_HORIZON_END,
  });

  const forecastAfter = buildForecast({
    anchorDate: HARNESS_ANCHOR_DATE,
    anchorBalance: 500_000,
    threshold: 50_000,
    rules,
    transactions: transactionsAfter,
    horizonEnd: HARNESS_HORIZON_END,
  });

  const candidatesBefore = buildForecastReparentCandidates({
    transactions: transactionsBefore,
    forecast: forecastBefore,
    rules,
    anchorDate: HARNESS_ANCHOR_DATE,
    horizonEnd: HARNESS_HORIZON_END,
  });

  return {
    anchorDate: HARNESS_ANCHOR_DATE,
    horizonEnd: HARNESS_HORIZON_END,
    rules,
    transactionsBefore,
    transactionsAfter,
    reparent,
    forecastBefore,
    forecastAfter,
    virtualRentBefore: virtualRentRow(forecastBefore),
    virtualRentAfter: virtualRentRow(forecastAfter),
    candidatesBefore,
    finalBalanceBefore: forecastBefore[forecastBefore.length - 1]!.balance,
    finalBalanceAfter: forecastAfter[forecastAfter.length - 1]!.balance,
    targetRuleDate,
  };
}