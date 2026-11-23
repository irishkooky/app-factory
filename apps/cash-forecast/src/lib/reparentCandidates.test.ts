import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import {
  buildReparentRulesHarnessScenario,
} from "./reparentRulesHarnessScenario";
import { filterReparentMoveCandidates } from "./reparentCandidates";

describe("filterReparentMoveCandidates", () => {
  it("移動元の実取引を単発候補から除外する", () => {
    const scenario = buildReparentRulesHarnessScenario();
    const sourceId = scenario.transactionsBefore[0]!._id;
    const filtered = filterReparentMoveCandidates(scenario.candidatesBefore, {
      kind: "expense",
      sourceTxId: sourceId,
    });
    const oneoffIds = filtered
      .filter((c) => c.targetKind === "transaction" && c.section === "oneoff")
      .map((c) => (c.targetKind === "transaction" ? c.txId : ""));
    expect(oneoffIds).not.toContain(sourceId);
    expect(oneoffIds).toContain("tx_grocery" as Id<"transactions">);
  });
});