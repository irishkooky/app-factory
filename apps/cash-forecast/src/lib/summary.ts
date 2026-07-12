import type { ForecastRow } from "./forecast";
import { monthOf } from "./date";

export type MonthSummary = {
  month: string; // "YYYY-MM"
  income: number; // 収入合計（正の数）
  expense: number; // 支出合計（正の数）
  net: number; // income - expense
  savingsRate: number | null; // net / income。income <= 0 のとき null
};

/** buildForecast の出力（アドオン合算・吸収処理済みの最終行）を月ごとに集計する。 */
export function summarizeByMonth(rows: ForecastRow[]): MonthSummary[] {
  const byMonth = new Map<string, { income: number; expense: number }>();

  for (const row of rows) {
    const month = monthOf(row.date);
    const bucket = byMonth.get(month) ?? { income: 0, expense: 0 };
    if (row.kind === "income") {
      bucket.income += row.amount;
    } else {
      bucket.expense += row.amount;
    }
    byMonth.set(month, bucket);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, { income, expense }]) => {
      const net = income - expense;
      return {
        month,
        income,
        expense,
        net,
        savingsRate: income > 0 ? net / income : null,
      };
    });
}
