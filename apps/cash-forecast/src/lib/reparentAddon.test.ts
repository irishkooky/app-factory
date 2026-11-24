import { describe, expect, it } from "vitest";
import { computeReparentAddonToRuleMonth, computeReparentAddonToTransaction } from "./reparentAddon";
import type { ReparentTxSnapshot } from "./reparentBreakdown";

function tx(partial: Partial<ReparentTxSnapshot> & Pick<ReparentTxSnapshot, "id">): ReparentTxSnapshot {
  return {
    kind: "expense",
    amount: 0,
    date: "2026-05-01",
    ...partial,
  };
}

describe("computeReparentAddonToTransaction", () => {
  it("addon をターゲット内訳に足す", () => {
    const result = computeReparentAddonToTransaction({
      addon: tx({
        id: "a1",
        addon: true,
        amount: 4_000,
        date: "2026-11-10",
      }),
      target: tx({
        id: "t1",
        amount: 12_000,
        amountBreakdown: [{ amount: 12_000 }],
        date: "2026-05-01",
      }),
      expectedAmount: 4_000,
      expectedLabel: "繰越分",
      anchorDate: "2026-03-15",
      horizonEnd: "2027-03-15",
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.target.amount).toBe(16_000);
    expect(result.line).toEqual({ amount: 4_000, label: "繰越分" });
  });

  it("履歴側 addon を拒否", () => {
    const result = computeReparentAddonToTransaction({
      addon: tx({
        id: "a1",
        addon: true,
        amount: 1_000,
        date: "2026-02-01",
        actual: true,
      }),
      target: tx({ id: "t1", amount: 2_000, date: "2026-02-02" }),
      expectedAmount: 1_000,
      anchorDate: "2026-03-15",
      horizonEnd: "2027-03-15",
    });
    expect(result).toEqual({ error: "履歴と予定のあいだでは移動できません" });
  });
});

describe("computeReparentAddonToRuleMonth", () => {
  it("別ルール月へ patch", () => {
    const result = computeReparentAddonToRuleMonth({
      addon: {
        ...tx({ id: "a1", addon: true, amount: 4_000, date: "2026-11-10" }),
        ruleId: "rule_1",
        ruleMonth: "2026-11",
      },
      target: { ruleId: "rule_1", ruleMonth: "2026-12", date: "2026-12-25" },
      expectedAmount: 4_000,
      anchorDate: "2026-03-15",
      horizonEnd: "2027-03-15",
      targetMonthHasOverride: false,
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.patch.ruleMonth).toBe("2026-12");
  });

  it("同じルール月は拒否", () => {
    const result = computeReparentAddonToRuleMonth({
      addon: {
        ...tx({ id: "a1", addon: true, amount: 4_000, date: "2026-11-10" }),
        ruleId: "rule_1",
        ruleMonth: "2026-11",
      },
      target: { ruleId: "rule_1", ruleMonth: "2026-11", date: "2026-11-25" },
      expectedAmount: 4_000,
      anchorDate: "2026-03-15",
      horizonEnd: "2027-03-15",
      targetMonthHasOverride: false,
    });
    expect(result).toEqual({ error: "同じルール月には移動できません" });
  });
});