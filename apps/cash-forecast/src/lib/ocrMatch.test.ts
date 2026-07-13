import { describe, expect, it } from "vitest";
import type { ForecastRow } from "./forecast";
import { matchExtractedRows, validateBalanceChain, type ExtractedRow } from "./ocrMatch";

let rowSeq = 0;
function makeRow(overrides: Partial<ForecastRow> & Pick<ForecastRow, "date" | "kind" | "amount">): ForecastRow {
  rowSeq += 1;
  return {
    key: `row-${rowSeq}`,
    name: "予定",
    balance: 0,
    isVirtual: true,
    belowThreshold: false,
    ...overrides,
  };
}

function makeExtracted(
  overrides: Partial<ExtractedRow> & Pick<ExtractedRow, "date" | "kind" | "amount">,
): ExtractedRow {
  return { name: "取引", ...overrides };
}

describe("matchExtractedRows", () => {
  it("完全一致（同日・同kind・同amount）は existing になる", () => {
    const period = makeRow({ date: "2026-07-10", kind: "expense", amount: 5000, name: "家賃" });
    const extracted = makeExtracted({ date: "2026-07-10", kind: "expense", amount: 5000, name: "家賃振込" });

    const { matches, unmatchedPeriodRows } = matchExtractedRows({
      extracted: [extracted],
      periodRows: [period],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([{ type: "existing", extracted, row: period }]);
    expect(unmatchedPeriodRows).toEqual([]);
  });

  it("±3日以内のズレは existing になる", () => {
    const period = makeRow({ date: "2026-07-10", kind: "income", amount: 300_000 });
    const extracted = makeExtracted({ date: "2026-07-13", kind: "income", amount: 300_000 });

    const { matches } = matchExtractedRows({
      extracted: [extracted],
      periodRows: [period],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([{ type: "existing", extracted, row: period }]);
  });

  it("4日以上のズレは existing にならず new になる", () => {
    const period = makeRow({ date: "2026-07-10", kind: "income", amount: 300_000 });
    const extracted = makeExtracted({ date: "2026-07-14", kind: "income", amount: 300_000 });

    const { matches, unmatchedPeriodRows } = matchExtractedRows({
      extracted: [extracted],
      periodRows: [period],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([{ type: "new", extracted }]);
    expect(unmatchedPeriodRows).toEqual([period]);
  });

  it("同額複数候補は最も日付が近いものを選び、1対1で消費する", () => {
    const near = makeRow({ date: "2026-07-11", kind: "expense", amount: 1000, name: "近い方" });
    const far = makeRow({ date: "2026-07-08", kind: "expense", amount: 1000, name: "遠い方" });
    const extracted = makeExtracted({ date: "2026-07-10", kind: "expense", amount: 1000 });

    const { matches, unmatchedPeriodRows } = matchExtractedRows({
      extracted: [extracted],
      periodRows: [far, near],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([{ type: "existing", extracted, row: near }]);
    expect(unmatchedPeriodRows).toEqual([far]);
  });

  it("同額複数候補が2件あり、それぞれに対応する2件の抽出行があれば1対1で消費される", () => {
    const rowA = makeRow({ date: "2026-07-05", kind: "expense", amount: 2000, name: "A" });
    const rowB = makeRow({ date: "2026-07-06", kind: "expense", amount: 2000, name: "B" });
    const extractedA = makeExtracted({ date: "2026-07-05", kind: "expense", amount: 2000 });
    const extractedB = makeExtracted({ date: "2026-07-06", kind: "expense", amount: 2000 });

    const { matches, unmatchedPeriodRows } = matchExtractedRows({
      extracted: [extractedA, extractedB],
      periodRows: [rowA, rowB],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([
      { type: "existing", extracted: extractedA, row: rowA },
      { type: "existing", extracted: extractedB, row: rowB },
    ]);
    expect(unmatchedPeriodRows).toEqual([]);
  });

  it("紐付く予定/実績が無ければ new になる", () => {
    const extracted = makeExtracted({ date: "2026-07-10", kind: "expense", amount: 3000 });

    const { matches, unmatchedPeriodRows } = matchExtractedRows({
      extracted: [extracted],
      periodRows: [],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([{ type: "new", extracted }]);
    expect(unmatchedPeriodRows).toEqual([]);
  });

  it("既存実績と同一(date,kind,amount)なら duplicateSuspect になる", () => {
    const extracted = makeExtracted({ date: "2026-07-05", kind: "expense", amount: 4000 });

    const { matches } = matchExtractedRows({
      extracted: [extracted],
      periodRows: [],
      historyRows: [{ date: "2026-07-05", kind: "expense", amount: 4000 }],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([{ type: "duplicateSuspect", extracted }]);
  });

  it("旧基準日以前（date <= anchorDate）は outOfRange になる", () => {
    const extracted = makeExtracted({ date: "2026-07-01", kind: "expense", amount: 1000 });

    const { matches } = matchExtractedRows({
      extracted: [extracted],
      periodRows: [],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([{ type: "outOfRange", extracted }]);
  });

  it("紐付かなかった periodRows は unmatchedPeriodRows に残る", () => {
    const unmatched = makeRow({ date: "2026-07-10", kind: "income", amount: 9999, name: "消化されない予定" });

    const { unmatchedPeriodRows } = matchExtractedRows({
      extracted: [],
      periodRows: [unmatched],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(unmatchedPeriodRows).toEqual([unmatched]);
  });

  it("バッチ内に同一(date,kind,amount)の抽出行が複数あれば、2件目以降は duplicateSuspect になる", () => {
    const first = makeExtracted({ date: "2026-07-10", kind: "expense", amount: 1500, name: "コンビニ" });
    const second = makeExtracted({ date: "2026-07-10", kind: "expense", amount: 1500, name: "コンビニ" });

    const { matches, unmatchedPeriodRows } = matchExtractedRows({
      extracted: [first, second],
      periodRows: [],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([
      { type: "new", extracted: first },
      { type: "duplicateSuspect", extracted: second },
    ]);
    expect(unmatchedPeriodRows).toEqual([]);
  });

  it("バッチ内の重複が periodRow に一致する場合も、1件目のみ existing で2件目は duplicateSuspect になる", () => {
    const period = makeRow({ date: "2026-07-10", kind: "expense", amount: 1500, name: "家賃" });
    const first = makeExtracted({ date: "2026-07-10", kind: "expense", amount: 1500 });
    const second = makeExtracted({ date: "2026-07-10", kind: "expense", amount: 1500 });

    const { matches, unmatchedPeriodRows } = matchExtractedRows({
      extracted: [first, second],
      periodRows: [period],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    expect(matches).toEqual([
      { type: "existing", extracted: first, row: period },
      { type: "duplicateSuspect", extracted: second },
    ]);
    expect(unmatchedPeriodRows).toEqual([]);
  });

  it("最良候補が既に別の抽出行に消費済みで他に未消費候補が無ければ new ではなく duplicateSuspect になる", () => {
    const period = makeRow({ date: "2026-07-10", kind: "expense", amount: 2000, name: "予定" });
    // 同じ periodRow を取り合うが、日付が異なるため batch内dedupのキー(date,kind,amount)には引っかからない。
    const first = makeExtracted({ date: "2026-07-11", kind: "expense", amount: 2000 });
    const second = makeExtracted({ date: "2026-07-09", kind: "expense", amount: 2000 });

    const { matches, unmatchedPeriodRows } = matchExtractedRows({
      extracted: [first, second],
      periodRows: [period],
      historyRows: [],
      anchorDate: "2026-07-01",
    });

    // 処理順序は date 昇順なので second(07-09) が先に処理され existing、first(07-11) が duplicateSuspect になる。
    expect(matches).toEqual([
      { type: "existing", extracted: second, row: period },
      { type: "duplicateSuspect", extracted: first },
    ]);
    expect(unmatchedPeriodRows).toEqual([]);
  });
});

describe("validateBalanceChain", () => {
  it("整合したチェーンでは警告が出ない", () => {
    const rows: ExtractedRow[] = [
      { date: "2026-07-01", name: "給与", kind: "income", amount: 300_000, balanceAfter: 400_000 },
      { date: "2026-07-02", name: "家賃", kind: "expense", amount: 80_000, balanceAfter: 320_000 },
    ];
    expect(validateBalanceChain(rows)).toEqual([]);
  });

  it("不整合な箇所で当該行の日付を含む警告を返す", () => {
    const rows: ExtractedRow[] = [
      { date: "2026-07-01", name: "給与", kind: "income", amount: 300_000, balanceAfter: 400_000 },
      { date: "2026-07-02", name: "家賃", kind: "expense", amount: 80_000, balanceAfter: 999_999 },
    ];
    expect(validateBalanceChain(rows)).toEqual(["2026-07-02 付近で明細の抜けの可能性があります"]);
  });

  it("balanceAfter欠落を挟むと、その前後の遷移は検証されず再開後から検証される", () => {
    const rows: ExtractedRow[] = [
      { date: "2026-07-01", name: "A", kind: "income", amount: 100_000, balanceAfter: 500_000 },
      { date: "2026-07-02", name: "B(欠落)", kind: "expense", amount: 10_000 }, // balanceAfterなし
      { date: "2026-07-03", name: "C", kind: "expense", amount: 1_000, balanceAfter: 999_999 }, // Aとは不整合だが検証対象外
      { date: "2026-07-04", name: "D", kind: "income", amount: 1_000, balanceAfter: 1_000_999 }, // Cとは整合
    ];
    // (A,B): Bにbalanceなし→スキップ。(B,C): Bにbalanceなし→スキップ。(C,D): 両方balanceあり→検証、整合。
    expect(validateBalanceChain(rows)).toEqual([]);
  });

  it("再開後の遷移が不整合なら警告が出る", () => {
    const rows: ExtractedRow[] = [
      { date: "2026-07-01", name: "A", kind: "income", amount: 100_000, balanceAfter: 500_000 },
      { date: "2026-07-02", name: "B(欠落)", kind: "expense", amount: 10_000 },
      { date: "2026-07-03", name: "C", kind: "expense", amount: 1_000, balanceAfter: 999_999 },
      { date: "2026-07-04", name: "D", kind: "income", amount: 1_000, balanceAfter: 5_000_000 },
    ];
    expect(validateBalanceChain(rows)).toEqual(["2026-07-04 付近で明細の抜けの可能性があります"]);
  });

  it("同日の行は入力順のまま比較される", () => {
    const rows: ExtractedRow[] = [
      { date: "2026-07-01", name: "先", kind: "income", amount: 100_000, balanceAfter: 500_000 },
      { date: "2026-07-01", name: "後", kind: "expense", amount: 100_000, balanceAfter: 400_000 },
    ];
    expect(validateBalanceChain(rows)).toEqual([]);
  });
});
