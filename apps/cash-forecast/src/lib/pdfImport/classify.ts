// パース済みスケジュールから、UI上のプレビュー一覧（登録候補）を組み立てる純粋関数。
// past/duplicate/warning/ready の分類はここで確定させるが、
// サーバー側(convex/imports.ts)でも同じ条件で再判定し、クライアントの分類は信用しない。

import type { ParsedSchedule } from "./jfc";
import { buildImportKey, buildRowName } from "./jfc";

export type ImportRowStatus = "ready" | "past" | "duplicate" | "warning";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1_000_000_000;

export type ImportCandidate = {
  importKey: string;
  date: string;
  name: string;
  kind: "expense";
  amount: number;
  status: ImportRowStatus;
  warnings: string[];
  seq: number;
};

export function buildCandidates(input: {
  schedule: ParsedSchedule;
  prefix: string;
  anchorDate: string;
  existingImportKeys: ReadonlySet<string>;
}): ImportCandidate[] {
  const { schedule, prefix, anchorDate, existingImportKeys } = input;

  return schedule.rows.map((row) => {
    const importKey = buildImportKey(schedule, row);
    const name = buildRowName(prefix, row, schedule.totalCount);

    const warnings = [...row.warnings];
    if (!Number.isInteger(row.payment) || row.payment < MIN_AMOUNT || row.payment > MAX_AMOUNT) {
      warnings.push("金額が登録できる範囲外です");
    }

    let status: ImportRowStatus;
    if (row.date <= anchorDate) {
      status = "past";
    } else if (existingImportKeys.has(importKey)) {
      status = "duplicate";
    } else if (warnings.length > 0) {
      status = "warning";
    } else {
      status = "ready";
    }

    return {
      importKey,
      date: row.date,
      name,
      kind: "expense",
      amount: row.payment,
      status,
      warnings,
      seq: row.seq,
    };
  });
}
