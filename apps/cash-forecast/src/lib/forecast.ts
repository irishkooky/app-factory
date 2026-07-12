import type { Doc, Id } from "../../convex/_generated/dataModel";
import { addMonths, clampDay, monthOf } from "./date";

export type ForecastRow = {
  key: string; // "tx-<_id>" または "rule-<ruleId>-<yyyy-mm>"
  date: string;
  name: string;
  kind: "income" | "expense";
  amount: number;
  balance: number; // この行適用後の残高
  isVirtual: boolean; // true = ルール由来の仮想行（未確定の予定）
  txId?: Id<"transactions">;
  ruleId?: Id<"rules">;
  ruleMonth?: string; // 仮想行に設定（確定時に使う）
  belowThreshold: boolean;
};

type UnpricedRow = Omit<ForecastRow, "balance" | "belowThreshold">;

export function buildForecast(input: {
  anchorDate: string;
  anchorBalance: number;
  threshold: number;
  rules: Doc<"rules">[];
  transactions: Doc<"transactions">[]; // date > anchorDate のもの（クエリで絞り済み）
  horizonEnd: string;
}): ForecastRow[] {
  const { anchorDate, anchorBalance, threshold, rules, transactions, horizonEnd } = input;

  // 1. 実取引を防御的に再フィルタして行化
  const txRows: UnpricedRow[] = transactions
    .filter((tx) => tx.date > anchorDate && tx.date <= horizonEnd)
    .map((tx) => ({
      key: `tx-${tx._id}`,
      date: tx.date,
      name: tx.name,
      kind: tx.kind,
      amount: tx.amount,
      isVirtual: false,
      txId: tx._id,
      ruleId: tx.ruleId,
      ruleMonth: tx.ruleMonth,
    }));

  // 2. 上書き済み集合 (ruleId と ruleMonth が両方ある行のみ)
  const overridden = new Set<string>();
  for (const tx of transactions) {
    if (tx.ruleId !== undefined && tx.ruleMonth !== undefined) {
      overridden.add(`${tx.ruleId}:${tx.ruleMonth}`);
    }
  }

  // 3. 各ルールについて仮想行を生成
  const virtualRows: UnpricedRow[] = [];
  const startMonth = monthOf(anchorDate);
  const endMonth = monthOf(horizonEnd);

  for (const rule of rules) {
    let month = startMonth;
    // 安全のため月数の上限を設ける（無限ループ防止）
    for (let i = 0; i < 1200 && month <= endMonth; i++, month = addMonths(month, 1)) {
      const [yearStr, monthStr] = month.split("-");
      const year = Number(yearStr);
      const monthNum = Number(monthStr);
      const day = clampDay(year, monthNum, rule.dayOfMonth);
      const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      if (!(anchorDate < date && date <= horizonEnd)) continue;
      if (rule.endDate !== undefined && date > rule.endDate) continue;
      if (overridden.has(`${rule._id}:${month}`)) continue;

      virtualRows.push({
        key: `rule-${rule._id}-${month}`,
        date,
        name: rule.name,
        kind: rule.kind,
        amount: rule.amount,
        isVirtual: true,
        txId: undefined,
        ruleId: rule._id,
        ruleMonth: month,
      });
    }
  }

  // 4. ソート: date昇順 → 同日内は income が先 → 同種内は name の localeCompare
  const allRows = [...txRows, ...virtualRows];
  allRows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "income" ? -1 : 1;
    return a.name.localeCompare(b.name, "ja");
  });

  // 5. 残高計算としきい値判定
  let balance = anchorBalance;
  return allRows.map((row) => {
    balance += row.kind === "income" ? row.amount : -row.amount;
    return {
      ...row,
      balance,
      belowThreshold: balance < threshold,
    };
  });
}
