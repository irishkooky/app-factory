import { describe, expect, it } from "vitest";
import type { Doc } from "../../convex/_generated/dataModel";
import { buildHistoryRows } from "./history";

let txSeq = 0;
function makeTx(
  overrides: Partial<Doc<"transactions">> & Pick<Doc<"transactions">, "date" | "name" | "kind" | "amount">,
): Doc<"transactions"> {
  txSeq += 1;
  return {
    _id: `tx_${txSeq}` as Doc<"transactions">["_id"],
    _creationTime: txSeq,
    userId: "user_1",
    ruleId: undefined,
    ruleMonth: undefined,
    addon: undefined,
    actual: true,
    batchId: undefined,
    ...overrides,
  };
}

describe("buildHistoryRows", () => {
  it("空配列を渡すと空配列を返す", () => {
    expect(buildHistoryRows({ anchorBalance: 1000, txs: [] })).toEqual([]);
  });

  it("収支混在: 最終行の残高が anchorBalance に一致する", () => {
    const rows = buildHistoryRows({
      anchorBalance: 100_000,
      txs: [
        makeTx({ date: "2026-07-05", name: "給与", kind: "income", amount: 300_000 }),
        makeTx({ date: "2026-07-10", name: "家賃", kind: "expense", amount: 80_000 }),
        makeTx({ date: "2026-07-15", name: "雑費", kind: "expense", amount: 20_000 }),
      ],
    });

    expect(rows).toHaveLength(3);
    expect(rows[rows.length - 1].balance).toBe(100_000);
  });

  it("ソート順: date昇順 -> 同日はincome先 -> nameのlocaleCompare(ja)", () => {
    const rows = buildHistoryRows({
      anchorBalance: 0,
      txs: [
        makeTx({ date: "2026-07-10", name: "支出B", kind: "expense", amount: 100 }),
        makeTx({ date: "2026-07-05", name: "先", kind: "expense", amount: 100 }),
        makeTx({ date: "2026-07-10", name: "収入A", kind: "income", amount: 100 }),
        makeTx({ date: "2026-07-10", name: "支出A", kind: "expense", amount: 100 }),
      ],
    });

    expect(rows.map((r) => `${r.date}:${r.name}`)).toEqual([
      "2026-07-05:先",
      "2026-07-10:収入A",
      "2026-07-10:支出A",
      "2026-07-10:支出B",
    ]);
  });

  it("負残高になっても正しく逆算・積み上げされる", () => {
    const rows = buildHistoryRows({
      anchorBalance: -50_000,
      txs: [
        makeTx({ date: "2026-07-01", name: "支出1", kind: "expense", amount: 100_000 }),
        makeTx({ date: "2026-07-02", name: "収入1", kind: "income", amount: 20_000 }),
      ],
    });

    // start = -50,000 - (-100,000 + 20,000) = -50,000 - (-80,000) = 30,000
    expect(rows[0].balance).toBe(30_000 - 100_000); // -70,000
    expect(rows[1].balance).toBe(-70_000 + 20_000); // -50,000
    expect(rows[rows.length - 1].balance).toBe(-50_000);
  });

  it("単一行: 残高はanchorBalanceと一致する", () => {
    const rows = buildHistoryRows({
      anchorBalance: 1234,
      txs: [makeTx({ date: "2026-07-01", name: "残高調整", kind: "income", amount: 1234 })],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].balance).toBe(1234);
  });
});
