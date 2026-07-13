import { monthOf } from "./date";

// summarizeByMonth が要求する最小限の形。ForecastRow / HistoryRow はどちらもこれを満たす
// （構造的部分型のため、フィールドが多いぶんには問題ない）。
export type MoneyRow = {
  date: string;
  kind: "income" | "expense";
  amount: number;
  balance: number;
};

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
export function summarizeByMonth(rows: MoneyRow[]): MonthSummary[] {
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

export type AverageSavings = {
  months: number; // 集計対象の月数（除外後）
  totalIncome: number;
  totalExpense: number;
  totalNet: number;
  savingsRate: number | null; // totalNet / totalIncome。totalIncome <= 0 のとき null
};

/**
 * 月次サマリーの加重平均貯蓄率（Σnet / Σincome）を求める。
 * 単純平均（各月のsavingsRateの平均）ではなく、収入で重み付けした平均にすることで
 * 低収入月の極端な率に引きずられないようにする。
 * excludeMonth（基準月＝部分月）は集計から除外する。
 * 除外後に対象月が0ならnullを返す。
 */
export function averageSavings(summaries: MonthSummary[], excludeMonth: string): AverageSavings | null {
  const targets = summaries.filter((s) => s.month !== excludeMonth);
  if (targets.length === 0) {
    return null;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  for (const s of targets) {
    totalIncome += s.income;
    totalExpense += s.expense;
  }
  const totalNet = totalIncome - totalExpense;

  return {
    months: targets.length,
    totalIncome,
    totalExpense,
    totalNet,
    savingsRate: totalIncome > 0 ? totalNet / totalIncome : null,
  };
}
