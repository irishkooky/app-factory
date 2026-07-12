import type { Doc, Id } from "../../convex/_generated/dataModel";
import { addMonths, clampDay, monthOf } from "./date";

export type AddonInfo = {
  txId: Id<"transactions">;
  name: string;
  kind: "income" | "expense";
  amount: number;
};

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
  baseAmount?: number; // 仮想行のみ: ルールのベース額
  addons?: AddonInfo[]; // 仮想行: 合算中のアドオン / 上書き行: 吸収されたアドオン
};

type UnpricedRow = Omit<ForecastRow, "balance" | "belowThreshold">;

function signed(kind: "income" | "expense", amount: number): number {
  return kind === "income" ? amount : -amount;
}

export function buildForecast(input: {
  anchorDate: string;
  anchorBalance: number;
  threshold: number;
  rules: Doc<"rules">[];
  transactions: Doc<"transactions">[]; // date > anchorDate のもの（クエリで絞り済み）
  horizonEnd: string;
}): ForecastRow[] {
  const { anchorDate, anchorBalance, threshold, rules, transactions, horizonEnd } = input;

  const toAddonInfo = (tx: Doc<"transactions">): AddonInfo => ({
    txId: tx._id,
    name: tx.name,
    kind: tx.kind,
    amount: tx.amount,
  });

  // 1. transactions を3分類する（addon === true の判定を厳密に行う）
  const manualOrOverrideTxs: Doc<"transactions">[] = [];
  const addonTxs: Doc<"transactions">[] = [];
  for (const tx of transactions) {
    if (tx.addon === true) {
      addonTxs.push(tx);
    } else {
      manualOrOverrideTxs.push(tx);
    }
  }

  // 2. 上書き済み集合 (ruleId と ruleMonth が両方ある「上書き行」のみ。addon行は除く)
  const overriddenKeys = new Set<string>();
  for (const tx of manualOrOverrideTxs) {
    if (tx.ruleId !== undefined && tx.ruleMonth !== undefined) {
      overriddenKeys.add(`${tx.ruleId}:${tx.ruleMonth}`);
    }
  }

  // ルールの存在チェック用（孤児アドオン判定に使う。削除済みルールはここに現れない）
  const ruleById = new Map(rules.map((rule) => [rule._id, rule] as const));

  // アドオンを (ruleId, ruleMonth) キーでグルーピングする。_creationTime 昇順を保証するため事前ソート。
  const sortedAddonTxs = [...addonTxs].sort((a, b) => a._creationTime - b._creationTime);
  const addonsByKey = new Map<
    string,
    { ruleId: Id<"rules">; ruleMonth: string; txs: Doc<"transactions">[] }
  >();
  for (const tx of sortedAddonTxs) {
    if (tx.ruleId === undefined || tx.ruleMonth === undefined) continue; // 型上あり得ないが防御
    const key = `${tx.ruleId}:${tx.ruleMonth}`;
    const group = addonsByKey.get(key);
    if (group) {
      group.txs.push(tx);
    } else {
      addonsByKey.set(key, { ruleId: tx.ruleId, ruleMonth: tx.ruleMonth, txs: [tx] });
    }
  }

  // 3. 実取引（手入力 + 上書き行）を行化。上書き行には吸収済みアドオンを付与する。
  const txRows: UnpricedRow[] = manualOrOverrideTxs
    .filter((tx) => tx.date > anchorDate && tx.date <= horizonEnd)
    .map((tx) => {
      const isOverride = tx.ruleId !== undefined && tx.ruleMonth !== undefined;
      const key = isOverride ? `${tx.ruleId}:${tx.ruleMonth}` : undefined;
      const absorbed = key ? addonsByKey.get(key)?.txs : undefined;
      return {
        key: `tx-${tx._id}`,
        date: tx.date,
        name: tx.name,
        kind: tx.kind,
        amount: tx.amount,
        isVirtual: false,
        txId: tx._id,
        ruleId: tx.ruleId,
        ruleMonth: tx.ruleMonth,
        addons: absorbed && absorbed.length > 0 ? absorbed.map(toAddonInfo) : undefined,
      };
    });

  // 4. 孤児アドオン: ルールが存在せず、かつ上書き行も無い (ruleId, ruleMonth) のアドオンは
  //    金額を黙って落とさないよう通常の行として出す。
  const orphanAddonRows: UnpricedRow[] = [];
  for (const group of addonsByKey.values()) {
    const key = `${group.ruleId}:${group.ruleMonth}`;
    if (overriddenKeys.has(key)) continue; // 上書き行に吸収済み
    if (ruleById.has(group.ruleId)) continue; // ルールが存在する → 仮想行に合算される
    for (const tx of group.txs) {
      if (!(tx.date > anchorDate && tx.date <= horizonEnd)) continue;
      orphanAddonRows.push({
        key: `tx-${tx._id}`,
        date: tx.date,
        name: tx.name,
        kind: tx.kind,
        amount: tx.amount,
        isVirtual: false,
        txId: tx._id,
        ruleId: tx.ruleId,
        ruleMonth: tx.ruleMonth,
        addons: undefined,
      });
    }
  }

  // 5. 各ルールについて仮想行を生成（ベース + アドオン合算）
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
      const key = `${rule._id}:${month}`;
      if (overriddenKeys.has(key)) continue;

      const addonTxsForMonth = addonsByKey.get(key)?.txs ?? [];
      const addonSignedSum = addonTxsForMonth.reduce(
        (sum, tx) => sum + signed(tx.kind, tx.amount),
        0,
      );
      const signedTotal = signed(rule.kind, rule.amount) + addonSignedSum;
      const kind: "income" | "expense" =
        signedTotal === 0 ? rule.kind : signedTotal > 0 ? "income" : "expense";
      const amount = Math.abs(signedTotal);

      virtualRows.push({
        key: `rule-${rule._id}-${month}`,
        date,
        name: rule.name,
        kind,
        amount,
        isVirtual: true,
        txId: undefined,
        ruleId: rule._id,
        ruleMonth: month,
        baseAmount: rule.amount,
        addons: addonTxsForMonth.length > 0 ? addonTxsForMonth.map(toAddonInfo) : undefined,
      });
    }
  }

  // 6. ソート: date昇順 → 同日内は income が先 → 同種内は name の localeCompare
  const allRows = [...txRows, ...orphanAddonRows, ...virtualRows];
  allRows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "income" ? -1 : 1;
    return a.name.localeCompare(b.name, "ja");
  });

  // 7. 残高計算としきい値判定
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
