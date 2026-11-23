import { describe, expect, it } from "vitest";
import {
  buildReparentRulesHarnessScenario,
  HARNESS_ANCHOR_DATE,
  HARNESS_MOVED_AMOUNT,
  HARNESS_MOVED_LABEL,
  HARNESS_SOURCE_DATE,
  HARNESS_TARGET_RULE_MONTH,
} from "./reparentRulesHarnessScenario";

describe("reparentRulesHarnessScenario（スクショ／E2E 共有）", () => {
  const scenario = buildReparentRulesHarnessScenario();

  it("移動前ソースは54k・移動後50k（computeReparent 由来）", () => {
    expect(scenario.transactionsBefore[0]!.amount).toBe(54_000);
    expect(scenario.transactionsAfter[0]!.amount).toBe(50_000);
    expect(scenario.reparent.source.amount).toBe(50_000);
  });

  it("移動後の家賃11月はベース130k + addon 繰越分 4k = 合計134k", () => {
    const row = scenario.virtualRentAfter;
    expect(row).toBeDefined();
    expect(row!.name).toBe("家賃");
    expect(row!.ruleMonth).toBe(HARNESS_TARGET_RULE_MONTH);
    expect(row!.baseAmount).toBe(130_000);
    expect(row!.amount).toBe(134_000);
    expect(row!.addons).toHaveLength(1);
    expect(row!.addons![0]!.name).toBe(HARNESS_MOVED_LABEL);
    expect(row!.addons![0]!.amount).toBe(HARNESS_MOVED_AMOUNT);
  });

  it("移動前の同月は addon 無しで130k", () => {
    const row = scenario.virtualRentBefore;
    expect(row).toBeDefined();
    expect(row!.amount).toBe(130_000);
    expect(row!.addons ?? []).toHaveLength(0);
  });

  it("最終残高は不変", () => {
    expect(scenario.finalBalanceAfter).toBe(scenario.finalBalanceBefore);
  });

  it("未確定候補はすべて基準日より後（ソースと同じ予定側）", () => {
    const virtuals = scenario.candidatesBefore.filter((c) => c.section === "recurring-virtual");
    expect(virtuals.length).toBeGreaterThan(0);
    for (const c of virtuals) {
      expect(c.date > HARNESS_ANCHOR_DATE).toBe(true);
    }
    expect(HARNESS_SOURCE_DATE > HARNESS_ANCHOR_DATE).toBe(true);
    // 3月の仮想行（3/25）は基準日 3/15 より後なのでピッカーに出うる
    const march = virtuals.find((c) => c.ruleMonth === "2026-03");
    if (march !== undefined) {
      expect(march.date).toBe("2026-03-25");
      expect(march.date > HARNESS_ANCHOR_DATE).toBe(true);
    }
  });
});