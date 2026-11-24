import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { Kind } from "./money";
import type { ForecastRow } from "./forecast";

export type ReparentSection = "oneoff" | "recurring-virtual" | "recurring-confirmed";

export type ReparentCandidateBase = {
  section: ReparentSection;
  name: string;
  date: string;
  kind: Kind;
  amount: number;
  /** 定期取引のルール名（表示用） */
  ruleName?: string;
  ruleId?: Id<"rules">;
  /** yyyy-mm */
  ruleMonth?: string;
};

export type ReparentTxCandidate = ReparentCandidateBase & {
  targetKind: "transaction";
  txId: Id<"transactions">;
};

export type ReparentRuleMonthCandidate = ReparentCandidateBase & {
  targetKind: "rule-month";
  ruleId: Id<"rules">;
  ruleMonth: string;
};

export type ReparentCandidate = ReparentTxCandidate | ReparentRuleMonthCandidate;

export type ReparentRuleMonthTarget = Pick<ReparentRuleMonthCandidate, "ruleId" | "ruleMonth" | "date">;

/** @deprecated 互換の別名。tx のみの候補だった時代の型名。 */
export type ReparentCandidateLegacy = ReparentTxCandidate;

export function buildForecastReparentCandidates(input: {
  transactions: Doc<"transactions">[];
  forecast: ForecastRow[];
  rules: Doc<"rules">[];
  anchorDate: string;
  horizonEnd: string;
}): ReparentCandidate[] {
  const { transactions, forecast, rules, anchorDate, horizonEnd } = input;
  const ruleById = new Map(rules.map((rule) => [rule._id, rule] as const));

  const oneoff: ReparentTxCandidate[] = [];
  const confirmed: ReparentTxCandidate[] = [];

  for (const tx of transactions) {
    if (tx.addon === true) continue;
    if (tx.importBatchId !== undefined) continue;
    if (!(tx.date > anchorDate && tx.date <= horizonEnd)) continue;

    if (tx.ruleId === undefined) {
      oneoff.push({
        targetKind: "transaction",
        section: "oneoff",
        txId: tx._id,
        name: tx.name,
        date: tx.date,
        kind: tx.kind,
        amount: tx.amount,
      });
      continue;
    }

    const rule = ruleById.get(tx.ruleId);
    confirmed.push({
      targetKind: "transaction",
      section: "recurring-confirmed",
      txId: tx._id,
      name: tx.name,
      date: tx.date,
      kind: tx.kind,
      amount: tx.amount,
      ruleId: tx.ruleId,
      ruleName: rule?.name ?? tx.name,
      ruleMonth: tx.ruleMonth,
    });
  }

  const virtual: ReparentRuleMonthCandidate[] = forecast
    .filter((row) => row.isVirtual && row.ruleId !== undefined && row.ruleMonth !== undefined)
    .map((row) => ({
      targetKind: "rule-month",
      section: "recurring-virtual",
      ruleId: row.ruleId!,
      ruleMonth: row.ruleMonth!,
      name: row.name,
      ruleName: row.name,
      date: row.date,
      kind: row.kind,
      amount: row.amount,
    }));

  return [...oneoff, ...virtual, ...confirmed];
}

/** ピッカー用: 同じ kind・移動元の実取引を候補から除外 */
export function filterReparentMoveCandidates(
  candidates: ReparentCandidate[],
  params: {
    kind: Kind
    sourceTxId?: Id<"transactions">
    sourceAddonRuleMonth?: { ruleId: Id<"rules">; ruleMonth: string }
  },
): ReparentCandidate[] {
  return candidates.filter((c) => {
    if (c.kind !== params.kind) return false
    if (c.targetKind === "transaction" && params.sourceTxId !== undefined && c.txId === params.sourceTxId) {
      return false
    }
    if (
      c.targetKind === "rule-month" &&
      params.sourceAddonRuleMonth !== undefined &&
      c.ruleId === params.sourceAddonRuleMonth.ruleId &&
      c.ruleMonth === params.sourceAddonRuleMonth.ruleMonth
    ) {
      return false
    }
    return true
  })
}

export function buildHistoryReparentCandidates(transactions: Doc<"transactions">[]): ReparentCandidate[] {
  return transactions
    .filter((tx) => tx.addon !== true && tx.importBatchId === undefined)
    .map((tx) => ({
      targetKind: "transaction" as const,
      section: (tx.ruleId === undefined ? "oneoff" : "recurring-confirmed") as ReparentSection,
      txId: tx._id,
      name: tx.name,
      date: tx.date,
      kind: tx.kind,
      amount: tx.amount,
      ruleMonth: tx.ruleMonth,
    }));
}