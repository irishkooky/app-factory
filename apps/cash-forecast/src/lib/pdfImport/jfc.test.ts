import { describe, expect, it } from "vitest";
import { groupItemsIntoLines, type TextItem, type TextLine } from "./textLayout";
import { buildImportKey, buildRowName, parseJfcSchedule } from "./jfc";

// 実PDFの数値は一切使わない。融資300万円・元金5万円固定・利息は逓減する合成データで
// 支払額=元金+利息を満たすように生成する。

const HEADER_LINE = "お 支 払 額 明 細 書";
const COMPANY_LINE = "株式会社日本政策金融公庫";
const CONTRACT_LINE = "特 1 2 - 3 4 5 6 ﾃ ｽ ﾄ 様";

type SyntheticRow = { seq: number; reiwaDate: string; payment: number; principal: number; interest: number; balanceAfter: number };

// pdfjsは1セル分の文字列を1つのitemとして返し、その中に半角スペース区切りで文字が入っている
// ことが多い（textLayout.test.ts参照）。この癖を再現したitemを作り、groupItemsIntoLinesに通す
// ところまでを含めた結合テストにする。
function spaced(s: string): string {
  return [...s].join(" ");
}

function cellItem(str: string, x: number, y: number): TextItem {
  const raw = spaced(str);
  // 幅は「文字数×10」程度で十分（隣接セルとのギャップ判定にだけ影響する）
  return { str: raw, x, y, width: raw.length * 5 };
}

function headerLines(y0: number): TextItem[] {
  return [
    cellItem(HEADER_LINE, 92, y0),
    cellItem(COMPANY_LINE, 20, y0 - 20),
    cellItem(CONTRACT_LINE, 20, y0 - 40),
  ];
}

function scheduleRowItems(row: SyntheticRow, y: number): TextItem[] {
  const cells = [
    String(row.seq),
    row.reiwaDate,
    row.payment.toLocaleString("en-US"),
    row.principal.toLocaleString("en-US"),
    row.interest.toLocaleString("en-US"),
    row.balanceAfter.toLocaleString("en-US"),
    "30",
  ];
  let x = 20;
  const items: TextItem[] = [];
  for (const cell of cells) {
    items.push(cellItem(cell, x, y));
    x += cell.length * 12 + 20; // 隣接セルとのギャップは常に10pt以上確保する
  }
  return items;
}

// 融資300万円、元金5万円固定、初回利息10,000円から100円ずつ逓減する合成スケジュールを作る。
function buildSyntheticRows(count: number, startBalance = 3_000_000): SyntheticRow[] {
  const rows: SyntheticRow[] = [];
  let balance = startBalance;
  const principal = 50_000;
  for (let i = 1; i <= count; i++) {
    const interest = 10_000 - (i - 1) * 100;
    const payment = principal + interest;
    balance -= principal;
    const month = ((i - 1) % 12) + 1;
    const day = 31 - (month % 2 === 0 ? 1 : 0); // 適当な日（1〜31範囲内であれば良い）
    rows.push({
      seq: i,
      reiwaDate: `9.${month}.${day <= 28 ? day : 28}`,
      payment,
      principal,
      interest,
      balanceAfter: balance,
    });
  }
  return rows;
}

// extractPdfLines.ts と同様、ページごとにgroupItemsIntoLinesを呼んでから連結する
// （ページをまたぐとy座標がリセットされるため、行のグルーピングもページ単位で行う必要がある）。
function buildFixtureLines(rows: SyntheticRow[], opts?: { pageBreakAfter?: number }): TextLine[] {
  const pages: TextItem[][] = [[]];
  let y = 800;
  pages[0].push(...headerLines(y));
  y -= 60;

  rows.forEach((row, idx) => {
    if (opts?.pageBreakAfter !== undefined && idx === opts.pageBreakAfter) {
      // 2ページ目: ヘッダが繰り返される想定。y座標はページ単位でリセットされる
      y = 800;
      pages.push([]);
      pages[pages.length - 1].push(...headerLines(y));
      y -= 60;
    }
    pages[pages.length - 1].push(...scheduleRowItems(row, y));
    y -= 15;
  });

  return pages.flatMap((pageItems) => groupItemsIntoLines(pageItems));
}

describe("parseJfcSchedule", () => {
  it("正常系: 全行が取れ、令和→西暦変換・0埋め・totalCount・contractIdが正しく、warningsは空", () => {
    const rows = buildSyntheticRows(5);
    const lines = buildFixtureLines(rows);
    const result = parseJfcSchedule(lines);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.schedule.contractId).toBe("12-3456");
    expect(result.schedule.totalCount).toBe(5);
    expect(result.schedule.rows).toHaveLength(5);
    expect(result.schedule.scheduleWarnings).toEqual([]);

    const first = result.schedule.rows[0];
    expect(first.seq).toBe(1);
    expect(first.date).toBe("2027-01-28"); // 令和9年 → 2018+9=2027、月日は0埋め
    expect(first.payment).toBe(first.principal + first.interest);
    expect(first.warnings).toEqual([]);

    for (const row of result.schedule.rows) {
      expect(row.warnings).toEqual([]);
    }
  });

  it("2ページに分かれヘッダが2回出ても、全行が連結して取れる", () => {
    const rows = buildSyntheticRows(6);
    const lines = buildFixtureLines(rows, { pageBreakAfter: 3 });
    const result = parseJfcSchedule(lines);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.rows.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.schedule.totalCount).toBe(6);
  });

  it("支払金額が元金+利息と一致しない行にwarningsが付く（他の行は影響を受けない）", () => {
    const rows = buildSyntheticRows(3);
    rows[1].payment = rows[1].payment + 1; // 2行目だけ壊す
    const lines = buildFixtureLines(rows);
    const result = parseJfcSchedule(lines);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.rows[0].warnings).toEqual([]);
    expect(result.schedule.rows[1].warnings).toContain("支払金額が元金+利息と一致しません");
    expect(result.schedule.rows[2].warnings).toEqual([]);
  });

  it("残高の連続性が崩れている行にwarningsが付く", () => {
    const rows = buildSyntheticRows(3);
    rows[2].balanceAfter = rows[2].balanceAfter - 999; // 3行目の残高だけ壊す
    const lines = buildFixtureLines(rows);
    const result = parseJfcSchedule(lines);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.rows[0].warnings).toEqual([]);
    expect(result.schedule.rows[1].warnings).toEqual([]);
    expect(result.schedule.rows[2].warnings).toContain("残高の連続性が崩れています");
  });

  it("非対応PDF（お支払額明細書の記載が無い）はok:falseを返す", () => {
    const items: TextItem[] = [cellItem("なにかべつのしょるい", 20, 800)];
    const result = parseJfcSchedule(groupItemsIntoLines(items));
    expect(result).toEqual({
      ok: false,
      error: "対応していないPDFです（日本政策金融公庫の「お支払額明細書」に対応しています）",
    });
  });

  it("取引番号が読み取れない場合はok:falseを返す", () => {
    const items: TextItem[] = [
      cellItem(HEADER_LINE, 92, 800),
      cellItem(COMPANY_LINE, 20, 780),
      // 「様」を含む行が無い
      cellItem("お客さま情報", 20, 760),
    ];
    const result = parseJfcSchedule(groupItemsIntoLines(items));
    expect(result).toEqual({ ok: false, error: "取引番号が読み取れませんでした" });
  });

  it("返済予定の行が1つも無ければok:falseを返す", () => {
    const items: TextItem[] = [...headerLines(800)];
    const result = parseJfcSchedule(groupItemsIntoLines(items));
    expect(result).toEqual({ ok: false, error: "返済予定の行が見つかりませんでした" });
  });

  it("取引番号がハイフンの前後で別セルに分かれても正しく合成される（実PDFで確認済みの癖）", () => {
    const items: TextItem[] = [
      cellItem(HEADER_LINE, 92, 800),
      cellItem(COMPANY_LINE, 20, 780),
      // 「12-」「3456」のように、ハイフンの前後が別セルとして分かれるケース
      cellItem("特", 20, 760),
      cellItem("12-", 40, 760),
      cellItem("3456", 70, 760),
      cellItem("会社", 110, 760),
      cellItem("様", 130, 760),
      ...scheduleRowItems(buildSyntheticRows(1)[0], 700),
    ];
    const result = parseJfcSchedule(groupItemsIntoLines(items));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.contractId).toBe("12-3456");
  });

  it("郵便番号(〒123-4567)を取引番号として誤検出しない", () => {
    const items: TextItem[] = [
      cellItem(HEADER_LINE, 92, 800),
      cellItem(COMPANY_LINE, 20, 780),
      // 同じ行に郵便番号と取引番号が両方出てくるケース。郵便番号を先に除去してから抽出する
      cellItem("〒999-9999", 20, 760),
      cellItem(CONTRACT_LINE, 120, 760),
      ...scheduleRowItems(buildSyntheticRows(1)[0], 700),
    ];
    const result = parseJfcSchedule(groupItemsIntoLines(items));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.contractId).toBe("12-3456");
  });

  it("支払年月日が年と月日で別セルに分かれても正しく結合される（例: '9.'+'3.31' → 2027-03-31）", () => {
    const cells = ["1", "9.", "3.31", "60,000", "50,000", "10,000", "2,950,000", "30"];
    let x = 20;
    const rowItems: TextItem[] = [];
    for (const cell of cells) {
      rowItems.push(cellItem(cell, x, 700));
      x += cell.length * 12 + 20;
    }
    const items: TextItem[] = [...headerLines(800), ...rowItems];
    const result = parseJfcSchedule(groupItemsIntoLines(items));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.rows).toHaveLength(1);
    expect(result.schedule.rows[0].date).toBe("2027-03-31");
  });

  it("先頭行(1回目)が読み取れない場合、scheduleWarningsに欠落の警告が付く", () => {
    const rows = buildSyntheticRows(3).slice(1); // seq=1を欠落させ、2,3のみ残す
    const lines = buildFixtureLines(rows);
    const result = parseJfcSchedule(lines);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.rows[0].seq).toBe(2);
    expect(result.schedule.rows).toHaveLength(2);
    expect(result.schedule.totalCount).toBe(3);
    expect(result.schedule.scheduleWarnings).toContain("先頭の行（1回目）が読み取れませんでした");
    expect(result.schedule.scheduleWarnings).toContain("全3回のうち2行しか読み取れませんでした");
  });

  it("先頭行はあるが途中の行が抜けている場合も、行数不足の警告だけが付く", () => {
    const rows = buildSyntheticRows(3).filter((r) => r.seq !== 2); // 2回目だけ欠落
    const lines = buildFixtureLines(rows);
    const result = parseJfcSchedule(lines);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.rows[0].seq).toBe(1);
    expect(result.schedule.scheduleWarnings).not.toContain("先頭の行（1回目）が読み取れませんでした");
    expect(result.schedule.scheduleWarnings).toContain("全3回のうち2行しか読み取れませんでした");
  });
});

describe("buildImportKey", () => {
  it("jfc:<contractId>:<seq> の形式になる", () => {
    const rows = buildSyntheticRows(2);
    const lines = buildFixtureLines(rows);
    const result = parseJfcSchedule(lines);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(buildImportKey(result.schedule, result.schedule.rows[0])).toBe("jfc:12-3456:1");
    expect(buildImportKey(result.schedule, result.schedule.rows[1])).toBe("jfc:12-3456:2");
  });
});

function scheduleRow(seq: number): Parameters<typeof buildRowName>[1] {
  return { seq, date: "2027-01-31", payment: 60_000, principal: 50_000, interest: 10_000, balanceAfter: 0, warnings: [] };
}

describe("buildRowName", () => {
  it("prefixをtrimして使い、`${prefix} ${seq}/${totalCount}回`の形式になる", () => {
    const row = scheduleRow(1);
    expect(buildRowName("  返済  ", row, 10)).toBe("返済 1/10回");
  });

  it("prefixが空（trim後）なら既定の「日本公庫 返済」になる", () => {
    const row = scheduleRow(1);
    expect(buildRowName("   ", row, 10)).toBe("日本公庫 返済 1/10回");
    expect(buildRowName("", row, 10)).toBe("日本公庫 返済 1/10回");
  });
});
