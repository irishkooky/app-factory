import { describe, expect, it } from "vitest";
import type { ReparentCandidate } from "./reparentCandidates";
import {
  cardPrimaryLabel,
  candidateMatchesQuery,
  dayDistanceFromSource,
  groupRecurringCandidates,
  oneoffCandidatesForTab,
  REPARENT_PICKER_DEFAULT_MONTHS_PER_RULE,
  sortByClosenessToSource,
} from "./reparentPickerLayout";
import type { Id } from "../../convex/_generated/dataModel";

const ruleA = "rule_a" as Id<"rules">;
const ruleB = "rule_b" as Id<"rules">;

function virtual(ruleId: Id<"rules">, ruleMonth: string, date: string, name: string): ReparentCandidate {
  return {
    targetKind: "rule-month",
    section: "recurring-virtual",
    ruleId,
    ruleMonth,
    name,
    ruleName: name,
    date,
    kind: "expense",
    amount: 100_000,
  };
}

describe("dayDistanceFromSource / sortByClosenessToSource", () => {
  const source = "2026-04-10";
  const list: ReparentCandidate[] = [
    virtual(ruleA, "2026-12", "2026-12-25", "家賃"),
    virtual(ruleA, "2026-05", "2026-05-25", "家賃"),
    virtual(ruleA, "2026-11", "2026-11-25", "家賃"),
  ];

  it("ソース日に近い順", () => {
    const sorted = sortByClosenessToSource(list, source);
    expect(sorted.map((c) => c.ruleMonth)).toEqual(["2026-05", "2026-11", "2026-12"]);
    expect(dayDistanceFromSource(source, "2026-05-25")).toBeLessThan(
      dayDistanceFromSource(source, "2026-11-25"),
    );
  });
});

describe("groupRecurringCandidates", () => {
  const source = "2026-04-10";
  const candidates: ReparentCandidate[] = [
    virtual(ruleA, "2026-05", "2026-05-25", "家賃"),
    virtual(ruleA, "2026-11", "2026-11-25", "家賃"),
    virtual(ruleA, "2026-12", "2026-12-25", "家賃"),
    virtual(ruleA, "2027-01", "2027-01-25", "家賃"),
    virtual(ruleB, "2026-06", "2026-06-10", "カード"),
  ];

  it("ルール名でグループ化し、各グループは近い月から defaultPerRule 件だけ", () => {
    const groups = groupRecurringCandidates(candidates, source, {
      query: "",
      expandedRuleIds: new Set(),
      defaultPerRule: REPARENT_PICKER_DEFAULT_MONTHS_PER_RULE,
    });
    expect(groups).toHaveLength(2);
    const rent = groups.find((g) => g.ruleName === "家賃")!;
    expect(rent.visibleItems).toHaveLength(3);
    expect(rent.hiddenCount).toBe(1);
    expect(rent.visibleItems.map((c) => c.ruleMonth)).toEqual(["2026-05", "2026-11", "2026-12"]);
  });

  it("expanded すると隠し分を出す", () => {
    const groups = groupRecurringCandidates(candidates, source, {
      query: "",
      expandedRuleIds: new Set([ruleA]),
    });
    const rent = groups.find((g) => g.ruleId === ruleA)!;
    expect(rent.visibleItems).toHaveLength(4);
    expect(rent.hiddenCount).toBe(0);
  });

  it("検索中は折りたたみしない", () => {
    const groups = groupRecurringCandidates(candidates, source, {
      query: "2026-12",
      expandedRuleIds: new Set(),
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.visibleItems).toHaveLength(1);
    expect(groups[0]!.hiddenCount).toBe(0);
  });
});

describe("cardPrimaryLabel", () => {
  it("定期は月ラベルのみ、単発は取引名", () => {
    expect(
      cardPrimaryLabel(virtual(ruleA, "2026-05", "2026-05-25", "家賃")),
    ).toBe("2026年5月");
    const oneoff: ReparentCandidate = {
      targetKind: "transaction",
      section: "oneoff",
      txId: "t1" as Id<"transactions">,
      name: "食料品",
      date: "2026-05-01",
      kind: "expense",
      amount: 12_000,
    };
    expect(cardPrimaryLabel(oneoff)).toBe("食料品");
  });
});

describe("candidateMatchesQuery / oneoffCandidatesForTab", () => {
  it("単発タブでも検索が効く", () => {
    const oneoff: ReparentCandidate = {
      targetKind: "transaction",
      section: "oneoff",
      txId: "t1" as Id<"transactions">,
      name: "食料品",
      date: "2026-05-01",
      kind: "expense",
      amount: 12_000,
    };
    expect(candidateMatchesQuery(oneoff, "食料")).toBe(true);
    expect(oneoffCandidatesForTab([oneoff], "2026-04-10", "食料")).toEqual([oneoff]);
    expect(oneoffCandidatesForTab([oneoff], "2026-04-10", "不存在")).toEqual([]);
  });
});