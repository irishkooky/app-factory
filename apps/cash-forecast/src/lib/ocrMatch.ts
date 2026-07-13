// OCR抽出結果と既存の予定/確定/手入力行とのマッチング。すべて純粋関数（DOM/ネットワークに触れない）。
import type { ForecastRow } from "./forecast";

export type ExtractedRow = {
  date: string;
  name: string;
  kind: "income" | "expense";
  amount: number;
  balanceAfter?: number;
};

export type OcrMatch =
  | { type: "existing"; extracted: ExtractedRow; row: ForecastRow } // 既存の予定/確定/手入力行と一致
  | { type: "new"; extracted: ExtractedRow } // 新規実績候補
  | { type: "duplicateSuspect"; extracted: ExtractedRow } // 既存実績と同一疑い（再アップロード対策）
  | { type: "outOfRange"; extracted: ExtractedRow }; // 旧基準日以前（対象外）

const MATCH_WINDOW_DAYS = 3;

function signed(kind: "income" | "expense", amount: number): number {
  return kind === "income" ? amount : -amount;
}

// "YYYY-MM-DD" 文字列同士の日数差（タイムゾーン非依存の純粋計算）。
function dateDiffDays(a: string, b: string): number {
  const toUtcDays = (s: string): number => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  return toUtcDays(a) - toUtcDays(b);
}

export function matchExtractedRows(input: {
  extracted: ExtractedRow[];
  periodRows: ForecastRow[]; // 旧anchor < date <= 明細最終日 の予定/確定/手入力行
  historyRows: { date: string; kind: string; amount: number }[]; // 既存実績（重複疑い判定用）
  anchorDate: string; // 旧基準日
}): { matches: OcrMatch[]; unmatchedPeriodRows: ForecastRow[] } {
  const { extracted, periodRows, historyRows, anchorDate } = input;

  const historyKeys = new Set(historyRows.map((h) => `${h.date}:${h.kind}:${h.amount}`));

  // 処理順序は date 昇順（1つの periodRow を複数の extracted 行が取り合う場合、早い日付の
  // extracted 行を優先的に消費させるため）。同日同士は元の配列順を保つ。
  const sortedExtracted = [...extracted]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.date !== b.row.date ? (a.row.date < b.row.date ? -1 : 1) : a.index - b.index))
    .map((entry) => entry.row);

  const consumed = new Set<string>(); // 消費済み periodRow.key
  // 同一バッチ内で既に existing/new として処理済みの (date,kind,amount)。
  // Geminiがプロンプト指示に反して同一取引を複数回出力した場合の二重計上防止に使う。
  const seenInBatch = new Set<string>();
  const matches: OcrMatch[] = [];

  for (const row of sortedExtracted) {
    if (row.date <= anchorDate) {
      matches.push({ type: "outOfRange", extracted: row });
      continue;
    }

    const key = `${row.date}:${row.kind}:${row.amount}`;
    if (historyKeys.has(key) || seenInBatch.has(key)) {
      matches.push({ type: "duplicateSuspect", extracted: row });
      continue;
    }

    let best: ForecastRow | undefined;
    let bestDiff = Infinity;
    let hadConsumedCandidate = false;
    for (const candidate of periodRows) {
      if (candidate.kind !== row.kind || candidate.amount !== row.amount) continue;
      const diff = Math.abs(dateDiffDays(row.date, candidate.date));
      if (diff > MATCH_WINDOW_DAYS) continue;
      if (consumed.has(candidate.key)) {
        // 金額・日付は一致するが、既に他の extracted 行に消費済み。
        // 「未消化の予定」としては扱えないため、new ではなく duplicateSuspect の候補にする。
        hadConsumedCandidate = true;
        continue;
      }
      if (best === undefined || diff < bestDiff || (diff === bestDiff && candidate.date < best.date)) {
        best = candidate;
        bestDiff = diff;
      }
    }

    if (best) {
      consumed.add(best.key);
      seenInBatch.add(key);
      matches.push({ type: "existing", extracted: row, row: best });
    } else if (hadConsumedCandidate) {
      // 一致しうる periodRow は既に別の extracted 行が消費済み ⇒ 同一取引の重複出力の疑い。
      matches.push({ type: "duplicateSuspect", extracted: row });
    } else {
      seenInBatch.add(key);
      matches.push({ type: "new", extracted: row });
    }
  }

  const unmatchedPeriodRows = periodRows.filter((row) => !consumed.has(row.key));

  return { matches, unmatchedPeriodRows };
}

// balanceAfter を持つ行を date 昇順（同日は入力順）に走査し、直前の行との整合を確認する。
// 直前または当該行の balanceAfter が欠けている区間はチェーンが中断しているとみなし、
// その遷移では警告を出さない（次に balanceAfter を持つ行が現れた時点から再開する）。
export function validateBalanceChain(rows: ExtractedRow[]): string[] {
  const sorted = [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.date !== b.row.date ? (a.row.date < b.row.date ? -1 : 1) : a.index - b.index))
    .map((entry) => entry.row);

  const warnings: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const current = sorted[i];
    if (prev.balanceAfter === undefined || current.balanceAfter === undefined) continue;
    const expected = prev.balanceAfter + signed(current.kind, current.amount);
    if (expected !== current.balanceAfter) {
      warnings.push(`${current.date} 付近で明細の抜けの可能性があります`);
    }
  }
  return warnings;
}
