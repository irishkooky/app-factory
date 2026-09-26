import { describe, expect, it } from "vitest";
import { buildCandidates } from "./classify";
import type { ParsedSchedule } from "./jfc";

function schedule(rows: ParsedSchedule["rows"]): ParsedSchedule {
  return {
    format: "jfc",
    contractId: "12-3456",
    rows,
    totalCount: rows[rows.length - 1]?.seq ?? 0,
    scheduleWarnings: [],
  };
}

function row(overrides: Partial<ParsedSchedule["rows"][number]> = {}): ParsedSchedule["rows"][number] {
  return {
    seq: 1,
    date: "2027-01-31",
    payment: 60_000,
    principal: 50_000,
    interest: 10_000,
    balanceAfter: 2_950_000,
    warnings: [],
    ...overrides,
  };
}

describe("buildCandidates", () => {
  it("anchorDate以前の行はpastになる（優先度が最も高い）", () => {
    const s = schedule([row({ seq: 1, date: "2026-01-01" })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.status).toBe("past");
  });

  it("past優先: pastかつimportKeyが既存でもpastになる", () => {
    const s = schedule([row({ seq: 1, date: "2026-01-01" })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(["jfc:12-3456:1"]),
    });
    expect(candidate.status).toBe("past");
  });

  it("既存のimportKeyと一致する行はduplicateになる", () => {
    const s = schedule([row({ seq: 1, date: "2027-01-31" })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(["jfc:12-3456:1"]),
    });
    expect(candidate.status).toBe("duplicate");
  });

  it("duplicate優先: duplicateかつwarningsがあってもduplicateになる", () => {
    const s = schedule([row({ seq: 1, date: "2027-01-31", warnings: ["残高の連続性が崩れています"] })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(["jfc:12-3456:1"]),
    });
    expect(candidate.status).toBe("duplicate");
  });

  it("warningsがある行（past/duplicateでない）はwarningになる", () => {
    const s = schedule([row({ seq: 1, date: "2027-01-31", warnings: ["支払金額が元金+利息と一致しません"] })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.status).toBe("warning");
    expect(candidate.warnings).toEqual(["支払金額が元金+利息と一致しません"]);
  });

  it("該当しない行はreadyになる", () => {
    const s = schedule([row({ seq: 1, date: "2027-01-31" })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.status).toBe("ready");
  });

  it("amountはpayment、kindは常にexpense", () => {
    const s = schedule([row({ seq: 1, payment: 12_345 })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2020-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.amount).toBe(12_345);
    expect(candidate.kind).toBe("expense");
  });

  it("importKeyは jfc:<contractId>:<seq> になる", () => {
    const s = schedule([row({ seq: 7 })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2020-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.importKey).toBe("jfc:12-3456:7");
  });

  it("名前はprefixとseq/totalCountから生成される", () => {
    const s = schedule([row({ seq: 3 }), row({ seq: 4 })]);
    const candidates = buildCandidates({
      schedule: s,
      prefix: "返済",
      anchorDate: "2020-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidates[0].name).toBe(`返済 3/${s.totalCount}回`);
    expect(candidates[1].name).toBe(`返済 4/${s.totalCount}回`);
  });

  it("amountが範囲外(0円)ならwarningになり、専用メッセージが付く", () => {
    const s = schedule([row({ seq: 1, date: "2027-01-31", payment: 0 })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.status).toBe("warning");
    expect(candidate.warnings).toContain("金額が登録できる範囲外です");
  });

  it("amountが範囲外(10億円超)ならwarningになる", () => {
    const s = schedule([row({ seq: 1, date: "2027-01-31", payment: 1_000_000_001 })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.status).toBe("warning");
    expect(candidate.warnings).toContain("金額が登録できる範囲外です");
  });

  it("amountが範囲外でもpast/duplicateの方が優先される", () => {
    const s = schedule([row({ seq: 1, date: "2026-01-01", payment: 0 })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2026-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.status).toBe("past");
  });

  it("prefixが空なら既定の名前になる", () => {
    const s = schedule([row({ seq: 1 })]);
    const [candidate] = buildCandidates({
      schedule: s,
      prefix: "",
      anchorDate: "2020-01-01",
      existingImportKeys: new Set(),
    });
    expect(candidate.name).toBe(`日本公庫 返済 1/${s.totalCount}回`);
  });
});
