import { describe, expect, it } from "vitest";
import type { ForecastRow } from "./forecast";
import { averageSavings, summarizeByMonth } from "./summary";

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

  it("minBalance/minBalanceDateが月ごとに正しく求まる（同値タイは最初の行）", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-07-05", kind: "income", amount: 100_000, balance: 90_000 }),
      makeRow({ date: "2026-07-10", kind: "expense", amount: 50_000, balance: 40_000 }), // 7月最小(1個目)
      makeRow({ date: "2026-07-20", kind: "income", amount: 10_000, balance: 40_000 }), // 同値だが2個目
      makeRow({ date: "2026-08-03", kind: "expense", amount: 20_000, balance: 20_000 }),
    ];
    const summary = summarizeByMonth(rows);
    const july = summary.find((s) => s.month === "2026-07");
    const august = summary.find((s) => s.month === "2026-08");
    expect(july?.minBalance).toBe(40_000);
    expect(july?.minBalanceDate).toBe("2026-07-10");
    expect(august?.minBalance).toBe(20_000);
    expect(august?.minBalanceDate).toBe("2026-08-03");
  });
});

describe("averageSavings", () => {
  it("単純平均ではなく加重平均（Σnet/Σincome）になる", () => {
    const rows: ForecastRow[] = [
      // 2026-02: 収入50万・支出30万 → net 20万、savingsRate 40%
      makeRow({ date: "2026-02-01", kind: "income", amount: 500_000 }),
      makeRow({ date: "2026-02-15", kind: "expense", amount: 300_000 }),
      // 2026-03: 収入1万・支出2万 → net -1万、savingsRate -100%
      makeRow({ date: "2026-03-01", kind: "income", amount: 10_000 }),
      makeRow({ date: "2026-03-15", kind: "expense", amount: 20_000 }),
    ];
    const summaries = summarizeByMonth(rows);

    const result = averageSavings(summaries, "2026-01"); // 除外対象の月は含まれない

    expect(result).not.toBeNull();
    expect(result?.months).toBe(2);
    expect(result?.totalIncome).toBe(510_000);
    expect(result?.totalExpense).toBe(320_000);
    expect(result?.totalNet).toBe(190_000);
    // 加重平均 ≈ 37.25%（単純平均の -30% とは異なる）
    expect(result?.savingsRate as number).toBeCloseTo(190_000 / 510_000, 10);
    expect(result?.savingsRate as number).not.toBeCloseTo(-0.3, 2);
  });

  it("excludeMonthに指定した月（基準月）は集計から除外される", () => {
    const rows: ForecastRow[] = [
      // 2026-04: 基準月（部分月）。これは除外されるべき
      makeRow({ date: "2026-04-20", kind: "income", amount: 1_000_000 }),
      // 2026-05: 通常月
      makeRow({ date: "2026-05-01", kind: "income", amount: 300_000 }),
      makeRow({ date: "2026-05-10", kind: "expense", amount: 100_000 }),
    ];
    const summaries = summarizeByMonth(rows);

    const result = averageSavings(summaries, "2026-04");

    expect(result?.months).toBe(1);
    expect(result?.totalIncome).toBe(300_000);
    expect(result?.totalExpense).toBe(100_000);
    expect(result?.totalNet).toBe(200_000);
    expect(result?.savingsRate as number).toBeCloseTo(200_000 / 300_000, 10);
  });

  it("income > 0でもnet < 0のときsavingsRateは負値になる", () => {
    const rows: ForecastRow[] = [
      // 2026-06: 収入10万・支出15万 → net -5万、savingsRate -50%
      makeRow({ date: "2026-06-01", kind: "income", amount: 100_000 }),
      makeRow({ date: "2026-06-15", kind: "expense", amount: 150_000 }),
    ];
    const summaries = summarizeByMonth(rows);

    const result = averageSavings(summaries, "2026-01");

    expect(result?.months).toBe(1);
    expect(result?.totalNet).toBe(-50_000);
    expect(result?.savingsRate).toBeCloseTo(-0.5, 10);
  });

  it("Σincomeが0以下のときsavingsRateはnullだが、他の合計値は返る", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-06-05", kind: "expense", amount: 50_000 }),
      makeRow({ date: "2026-07-05", kind: "expense", amount: 30_000 }),
    ];
    const summaries = summarizeByMonth(rows);

    const result = averageSavings(summaries, "2026-01");

    expect(result).not.toBeNull();
    expect(result?.months).toBe(2);
    expect(result?.totalIncome).toBe(0);
    expect(result?.totalExpense).toBe(80_000);
    expect(result?.totalNet).toBe(-80_000);
    expect(result?.savingsRate).toBeNull();
  });

  it("除外後に対象月が0件のときnullを返す", () => {
    const rows: ForecastRow[] = [makeRow({ date: "2026-08-01", kind: "income", amount: 100_000 })];
    const summaries = summarizeByMonth(rows);

    const result = averageSavings(summaries, "2026-08");

    expect(result).toBeNull();
  });
});
