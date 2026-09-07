// 日本政策金融公庫「お支払額明細書」（返済予定表）PDFのパーサー。
// groupItemsIntoLines() で得た行×セルの表から、返済スケジュールを抽出する純粋関数。
// 将来的に他フォーマットに対応する場合はこのファイルと同じ形の parser を追加していく想定。

import type { TextLine } from "./textLayout";

export type ParsedScheduleRow = {
  seq: number; // 回数
  date: string; // "YYYY-MM-DD"（令和 → 西暦: 2018 + YY）
  payment: number; // 支払金額
  principal: number; // 元金
  interest: number; // 利息
  balanceAfter: number; // 支払後残高
  warnings: string[]; // 整合性チェックの違反メッセージ（空なら正常）
};

export type ParsedSchedule = {
  format: "jfc";
  contractId: string; // 取引番号 例 "12-3456"
  rows: ParsedScheduleRow[];
  totalCount: number; // 最終行の回数
  scheduleWarnings: string[]; // 行単位ではなく、抜け・欠落など全体構造に関する警告
};

export type ParseResult = { ok: true; schedule: ParsedSchedule } | { ok: false; error: string };

const DEFAULT_NAME_PREFIX = "日本公庫 返済";

const CONTRACT_ID_RE = /(\d{1,3}-\d{1,7})/;
// 郵便番号（〒123-4567）を取引番号として誤検出しないよう、抽出前に取り除く
const POSTAL_CODE_RE = /〒\d{3}-\d{4}/g;
const SCHEDULE_ROW_RE =
  /^(\d{1,3}) (\d{1,2})\.(\d{1,2})\.(\d{1,2}) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) (\d{1,2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseAmount(raw: string): number | null {
  const digits = raw.replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  if (!Number.isInteger(value)) return null;
  return value;
}

// 実PDFでは支払年月日が「9.」「3.31」のように、年とdotが1セル・月日が別セルに
// 分かれて出ることがある（フォントのカーニングにより稀にセル間ギャップが広がるため）。
// 「YY.」+「MM.DD」の形をした隣接セルを1つに結合し、通常の「YY.MM.DD」1セルの形に揃える。
const YEAR_FRAGMENT_RE = /^\d{1,2}\.$/;
const MONTH_DAY_FRAGMENT_RE = /^\d{1,2}\.\d{1,2}$/;

function normalizeCells(cells: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < cells.length; i++) {
    const cur = cells[i];
    const next = cells[i + 1];
    if (next !== undefined && YEAR_FRAGMENT_RE.test(cur) && MONTH_DAY_FRAGMENT_RE.test(next)) {
      result.push(cur + next);
      i++; // nextは結合済みなので読み飛ばす
    } else {
      result.push(cur);
    }
  }
  return result;
}

type RawScheduleMatch = {
  seq: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balanceAfter: number;
};

function matchScheduleRow(joined: string): RawScheduleMatch | null {
  const m = SCHEDULE_ROW_RE.exec(joined);
  if (!m) return null;

  const seq = Number(m[1]);
  const reiwaYear = Number(m[2]);
  const month = Number(m[3]);
  const day = Number(m[4]);
  if (reiwaYear < 1 || reiwaYear > 99) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const payment = parseAmount(m[5]);
  const principal = parseAmount(m[6]);
  const interest = parseAmount(m[7]);
  const balanceAfter = parseAmount(m[8]);
  // m[9] は日割日数。整合性チェックの対象外なので保持しない。
  if (payment === null || principal === null || interest === null || balanceAfter === null) {
    return null;
  }

  const year = 2018 + reiwaYear;
  const date = `${year}-${pad2(month)}-${pad2(day)}`;

  return { seq, date, payment, principal, interest, balanceAfter };
}

export function parseJfcSchedule(lines: TextLine[]): ParseResult {
  const allText = lines.map((line) => line.cells.join("")).join("");
  if (!allText.includes("お支払額明細書") || !allText.includes("日本政策金融公庫")) {
    return { ok: false, error: "対応していないPDFです（日本政策金融公庫の「お支払額明細書」に対応しています）" };
  }

  let contractId: string | null = null;
  for (const line of lines) {
    // 取引番号は「12-」「3456」のように、ハイフンの前後が別セルに分かれて出ることがある
    // （実PDFで確認済み。intra-cellの空白除去だけでは繋がらない）。
    // セル区切りの空白を入れずに連結してから判定・抽出することで、この分割を吸収する。
    const joinedNoGap = line.cells.join("");
    if (!joinedNoGap.includes("様")) continue;
    const withoutPostalCode = joinedNoGap.replace(POSTAL_CODE_RE, "");
    const m = CONTRACT_ID_RE.exec(withoutPostalCode);
    if (m) {
      contractId = m[1];
      break;
    }
  }
  if (contractId === null) {
    return { ok: false, error: "取引番号が読み取れませんでした" };
  }

  const rows: ParsedScheduleRow[] = [];
  let prev: RawScheduleMatch | null = null;
  for (const line of lines) {
    const joined = normalizeCells(line.cells).join(" ");
    const match = matchScheduleRow(joined);
    if (!match) continue;

    const warnings: string[] = [];
    if (match.payment !== match.principal + match.interest) {
      warnings.push("支払金額が元金+利息と一致しません");
    }
    if (prev) {
      if (match.balanceAfter !== prev.balanceAfter - match.principal) {
        warnings.push("残高の連続性が崩れています");
      }
      if (match.seq !== prev.seq + 1) {
        warnings.push("回数が連番ではありません");
      }
      if (match.date <= prev.date) {
        warnings.push("日付の順序が崩れています");
      }
    }

    rows.push({
      seq: match.seq,
      date: match.date,
      payment: match.payment,
      principal: match.principal,
      interest: match.interest,
      balanceAfter: match.balanceAfter,
      warnings,
    });
    prev = match;
  }

  if (rows.length === 0) {
    return { ok: false, error: "返済予定の行が見つかりませんでした" };
  }

  const totalCount = rows[rows.length - 1].seq;

  // 個々の行の整合性(warnings)とは別に、行そのものが読み取れず抜け落ちているケースを検知する。
  const scheduleWarnings: string[] = [];
  if (rows[0].seq !== 1) {
    scheduleWarnings.push("先頭の行（1回目）が読み取れませんでした");
  }
  if (rows.length !== totalCount) {
    scheduleWarnings.push(`全${totalCount}回のうち${rows.length}行しか読み取れませんでした`);
  }

  return { ok: true, schedule: { format: "jfc", contractId, rows, totalCount, scheduleWarnings } };
}

export function buildImportKey(schedule: ParsedSchedule, row: ParsedScheduleRow): string {
  return `jfc:${schedule.contractId}:${row.seq}`;
}

export function buildRowName(prefix: string, row: ParsedScheduleRow, totalCount: number): string {
  const trimmed = prefix.trim();
  const base = trimmed.length > 0 ? trimmed : DEFAULT_NAME_PREFIX;
  return `${base} ${row.seq}/${totalCount}回`;
}
