import type { Doc, Id } from "../../convex/_generated/dataModel";
import { addonDisplayName } from "./forecast";

export type HistoryRow = {
  txId: Id<"transactions">;
  date: string;
  name: string;
  rawName: string; // 保存されている生の名前（編集フォームの初期値用。アドオンで未入力なら ""）
  isAddon: boolean;
  kind: "income" | "expense";
  amount: number;
  balance: number; // この行適用後の残高
};

function signed(kind: "income" | "expense", amount: number): number {
  return kind === "income" ? amount : -amount;
}

/**
 * 実績（actual）取引から履歴行を組み立てる。
 * 残高は「最終行適用後の残高が anchorBalance に一致する」よう逆算する
 * （anchorBalance は基準日終了時点の残高という意味論のため、実績行を積み上げた結果と一致させる）。
 */
export function buildHistoryRows(input: {
  anchorBalance: number;
  txs: Doc<"transactions">[];
}): HistoryRow[] {
  const { anchorBalance, txs } = input;

  const sorted = [...txs].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "income" ? -1 : 1;
    return a.name.localeCompare(b.name, "ja");
  });

  const totalSigned = sorted.reduce((sum, tx) => sum + signed(tx.kind, tx.amount), 0);
  let balance = anchorBalance - totalSigned;

  return sorted.map((tx) => {
    balance += signed(tx.kind, tx.amount);
    return {
      txId: tx._id,
      date: tx.date,
      name: tx.addon === true ? addonDisplayName(tx.name) : tx.name,
      rawName: tx.name,
      isAddon: tx.addon === true,
      kind: tx.kind,
      amount: tx.amount,
      balance,
    };
  });
}
