import { describe, expect, it } from "vitest";
import type { ForecastRow } from "./forecast";
import { summarizeByMonth } from "./summary";

let rowSeq = 0;
function makeRow(overrides: Partial<ForecastRow> & Pick<ForecastRow, "date" | "kind" | "amount">): ForecastRow {
  rowSeq += 1;
  return {
    key: `row_${rowSeq}`,
    name: "テスト行",
    balance: 0,
    isVirtual: false,
    belowThreshold: false,
    ...overrides,
  };
}

describe("summarizeByMonth", () => {
  it("複数月のincome/expense/netを月ごとに正しく集計し、月昇順で返す", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-05", kind: "income", amount: 428_748 }),
      makeRow({ date: "2026-08-20", kind: "expense", amount: 239_016 }),
      makeRow({ date: "2026-07-10", kind: "expense", amount: 50_000 }),
    ];

    const summary = summarizeByMonth(rows);

    expect(summary.map((s) => s.month)).toEqual(["2026-07", "2026-08"]);

    const july = summary[0];
    expect(july.income).toBe(0);
    expect(july.expense).toBe(50_000);
    expect(july.net).toBe(-50_000);
    expect(july.savingsRate).toBeNull(); // income <= 0

    const august = summary[1];
    expect(august.income).toBe(428_748);
    expect(august.expense).toBe(239_016);
    expect(august.net).toBe(189_732);
    expect(august.savingsRate).not.toBeNull();
    // 428,748収入・239,016支出 → net 189,732、貯蓄率 ≈ 0.4425（表示側で44%に整形）
    expect(august.savingsRate as number).toBeCloseTo(189_732 / 428_748, 10);
  });

  it("収入0の月はsavingsRateがnullになる", () => {
    const rows: ForecastRow[] = [makeRow({ date: "2026-09-01", kind: "expense", amount: 1000 })];
    const summary = summarizeByMonth(rows);
    expect(summary[0].income).toBe(0);
    expect(summary[0].savingsRate).toBeNull();
  });
});
