import type { Doc, Id } from "../../convex/_generated/dataModel";
import { addMonths, dateInMonth, monthOf, usagePeriodLabel } from "./date";
import { signedAmount, type Kind } from "./money";

export type AddonInfo = {
  txId: Id<"transactions">;
  name: string; // 表示用（未入力なら "上乗せ"）
  rawName: string; // 保存されている生の名前（編集フォームの初期値用。未入力なら ""）
  kind: Kind;
  amount: number;
};

/** 上乗せの表示名。名前が未入力（空文字）のときは既定ラベルを返す。 */
export function addonDisplayName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "上乗せ";
}

export type ForecastRow = {
  key: string; // "tx-<_id>" または "rule-<ruleId>-<yyyy-mm>"
  date: string;
  name: string;
  rawName?: string; // 表示用 name がフォールバックされている場合の生の名前。編集フォームの初期値用
  periodLabel?: string; // クレカ等の締め日が設定されたルール由来の行に付く利用期間表示「（8/19-9/18）」。name には混ぜない
  kind: Kind;
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

type EntrySortKey = { date: string; kind: Kind; name: string };

/** 予測行・実績行の並び順: date昇順 → 同日内は income が先 → 同種内は name の localeCompare */
export function compareEntries(a: EntrySortKey, b: EntrySortKey): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.kind !== b.kind) return a.kind === "income" ? -1 : 1;
  return a.name.localeCompare(b.name, "ja");
}

type Tx = Doc<"transactions">;

/** ルールの特定月の発生（仮想行1つ分）を指すキー。上書き行・アドオン・実績化済みの行はこのキーで仮想行と対応する。 */
function occurrenceKey(ruleId: Id<"rules">, ruleMonth: string): string {
  return `${ruleId}:${ruleMonth}`;
}

function occurrenceKeyOf(tx: Tx): string | undefined {
  return tx.ruleId !== undefined && tx.ruleMonth !== undefined ? occurrenceKey(tx.ruleId, tx.ruleMonth) : undefined;
}

function occurrenceKeys(txs: Tx[]): Set<string> {
  return new Set(txs.map(occurrenceKeyOf).filter((key) => key !== undefined));
}

function txRow(tx: Tx) {
  return {
    key: `tx-${tx._id}`,
    date: tx.date,
    kind: tx.kind,
    amount: tx.amount,
    isVirtual: false,
    txId: tx._id,
    ruleId: tx.ruleId,
    ruleMonth: tx.ruleMonth,
  };
}

function addonInfos(txs: Tx[]): AddonInfo[] | undefined {
  if (txs.length === 0) return undefined;
  return txs.map((tx) => ({
    txId: tx._id,
    name: addonDisplayName(tx.name),
    rawName: tx.name,
    kind: tx.kind,
    amount: tx.amount,
  }));
}

export function buildForecast(input: {
  anchorDate: string;
  anchorBalance: number;
  threshold: number;
  rules: Doc<"rules">[];
  transactions: Tx[]; // date > anchorDate のもの（クエリで絞り済み）
  /**
   * date <= anchorDate の取引（listHistory の結果）。行としては表示しないが、
   * 「その (ruleId, ruleMonth) は既に確定・実績化済み」の判定にだけ使う。
   * これを渡さないと、実績化された月の仮想行（予定）が復活してしまう。
   */
  historyTransactions?: Tx[];
  horizonEnd: string;
}): ForecastRow[] {
  const { anchorDate, anchorBalance, threshold, rules, transactions, historyTransactions, horizonEnd } = input;

  const inHorizon = (date: string) => anchorDate < date && date <= horizonEnd;
  const ruleById = new Map(rules.map((rule) => [rule._id, rule] as const));

  // 手入力行と上書き行（ルールの特定月を確定した行）。addon === true の判定は厳密に行う。
  const ownTxs = transactions.filter((tx) => tx.addon !== true);

  // 表示行として存在する上書き行のキー。
  const overriddenKeys = occurrenceKeys(ownTxs);
  // 履歴側（date <= anchorDate）で既に確定・実績化済みのキー。
  // 仮想行の抑止には使うが、「吸収してくれる表示行がある」ことは意味しないので
  // overriddenKeys とは別集合にする（孤児アドオン判定に混ぜると、合算先も吸収先も無い
  // アドオンの金額が黙って消えてしまう）。
  const settledInHistoryKeys = occurrenceKeys((historyTransactions ?? []).filter((tx) => tx.addon !== true));

  // アドオンを発生キーでグルーピングする。グループ内は _creationTime 昇順。
  const addonsByKey = new Map<string, { ruleId: Id<"rules">; txs: Tx[] }>();
  const addonTxs = transactions.filter((tx) => tx.addon === true).sort((a, b) => a._creationTime - b._creationTime);
  for (const tx of addonTxs) {
    if (tx.ruleId === undefined || tx.ruleMonth === undefined) continue;
    const key = occurrenceKey(tx.ruleId, tx.ruleMonth);
    const group = addonsByKey.get(key);
    if (group) {
      group.txs.push(tx);
    } else {
      addonsByKey.set(key, { ruleId: tx.ruleId, txs: [tx] });
    }
  }

  // 上書き行には吸収済みアドオンを付与する。
  const txRows: UnpricedRow[] = ownTxs
    .filter((tx) => inHorizon(tx.date))
    .map((tx) => {
      const key = occurrenceKeyOf(tx);
      const closingDay = tx.ruleId !== undefined ? ruleById.get(tx.ruleId)?.closingDay : undefined;
      return {
        ...txRow(tx),
        name: tx.name,
        periodLabel: closingDay !== undefined ? usagePeriodLabel(tx.date, closingDay) : undefined,
        addons: addonInfos(key === undefined ? [] : (addonsByKey.get(key)?.txs ?? [])),
      };
    });

  // 孤児アドオン: 吸収先の上書き行も合算先の仮想行も無いアドオンは、金額を黙って落とさないよう単独行として出す。
  // ルールが存在していても、その月が履歴側で確定済みなら仮想行は生成されない＝合算先が無い。
  const orphanAddonRows: UnpricedRow[] = [];
  for (const [key, group] of addonsByKey) {
    if (overriddenKeys.has(key)) continue;
    if (ruleById.has(group.ruleId) && !settledInHistoryKeys.has(key)) continue;
    for (const tx of group.txs) {
      if (!inHorizon(tx.date)) continue;
      orphanAddonRows.push({ ...txRow(tx), name: addonDisplayName(tx.name), rawName: tx.name });
    }
  }

  // 各ルールについて仮想行を生成（ベース + アドオン合算）
  const virtualRows: UnpricedRow[] = [];
  const endMonth = monthOf(horizonEnd);
  for (const rule of rules) {
    let month = monthOf(anchorDate);
    // 安全のため月数の上限を設ける（無限ループ防止）
    for (let i = 0; i < 1200 && month <= endMonth; i++, month = addMonths(month, 1)) {
      const date = dateInMonth(month, rule.dayOfMonth);
      if (!inHorizon(date)) continue;
      if (rule.endDate !== undefined && date > rule.endDate) continue;
      const key = occurrenceKey(rule._id, month);
      if (overriddenKeys.has(key) || settledInHistoryKeys.has(key)) continue;

      const addonTxsForMonth = addonsByKey.get(key)?.txs ?? [];
      const signedTotal = addonTxsForMonth.reduce(
        (sum, tx) => sum + signedAmount(tx.kind, tx.amount),
        signedAmount(rule.kind, rule.amount),
      );
      virtualRows.push({
        key: `rule-${rule._id}-${month}`,
        date,
        name: rule.name,
        periodLabel: rule.closingDay !== undefined ? usagePeriodLabel(date, rule.closingDay) : undefined,
        kind: signedTotal === 0 ? rule.kind : signedTotal > 0 ? "income" : "expense",
        amount: Math.abs(signedTotal),
        isVirtual: true,
        ruleId: rule._id,
        ruleMonth: month,
        baseAmount: rule.amount,
        addons: addonInfos(addonTxsForMonth),
      });
    }
  }

  const allRows = [...txRows, ...orphanAddonRows, ...virtualRows].sort(compareEntries);

  let balance = anchorBalance;
  return allRows.map((row) => {
    balance += signedAmount(row.kind, row.amount);
    return {
      ...row,
      balance,
      belowThreshold: balance < threshold,
    };
  });
}
