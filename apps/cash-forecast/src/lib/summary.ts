import type { ForecastRow } from "./forecast";
import { monthOf } from "./date";

export type MonthSummary = {
  month: string; // "YYYY-MM"
  income: number; // 収入合計（正の数）
  expense: number; // 支出合計（正の数）
  net: number; // income - expense
  savingsRate: number | null; // net / income。income <= 0 のとき null
  minBalance: number; // その月の行の中で最小のbalance
  minBalanceDate: string; // その日付（同値なら最初の行）
};

type MonthBucket = {
  income: number;
  expense: number;
  minBalance: number;
  minBalanceDate: string;
};

/** buildForecast の出力（アドオン合算・吸収処理済みの最終行。date昇順前提）を月ごとに集計する。 */
export function summarizeByMonth(rows: ForecastRow[]): MonthSummary[] {
  const byMonth = new Map<string, MonthBucket>();

  for (const row of rows) {
    const month = monthOf(row.date);
    const bucket = byMonth.get(month);
    if (bucket === undefined) {
      byMonth.set(month, {
        income: row.kind === "income" ? row.amount : 0,
        expense: row.kind === "expense" ? row.amount : 0,
        minBalance: row.balance,
        minBalanceDate: row.date,
      });
      continue;
    }
    if (row.kind === "income") {
      bucket.income += row.amount;
    } else {
      bucket.expense += row.amount;
    }
    if (row.balance < bucket.minBalance) {
      bucket.minBalance = row.balance;
      bucket.minBalanceDate = row.date;
    }
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, { income, expense, minBalance, minBalanceDate }]) => {
      const net = income - expense;
      return {
        month,
        income,
        expense,
        net,
        savingsRate: income > 0 ? net / income : null,
        minBalance,
        minBalanceDate,
      };
    });
}
