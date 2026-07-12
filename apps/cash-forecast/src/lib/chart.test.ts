import { describe, expect, it } from "vitest";
import type { ForecastRow } from "./forecast";
import { buildBalanceSeries } from "./chart";

let rowSeq = 0;
function makeRow(overrides: Partial<ForecastRow> & Pick<ForecastRow, "date" | "balance">): ForecastRow {
  rowSeq += 1;
  return {
    key: `row_${rowSeq}`,
    name: "テスト行",
    kind: "expense",
    amount: 0,
    isVirtual: false,
    belowThreshold: false,
    ...overrides,
  };
}

describe("buildBalanceSeries", () => {
  it("同日複数行はその日の最後のbalanceが1点になる", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-07-15", balance: 90_000 }),
      makeRow({ date: "2026-07-15", balance: 70_000 }),
    ];
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows,
      today: "2026-07-12",
      horizonEnd: "2026-07-20",
    });
    const day15Points = points.filter((p) => p.date === "2026-07-15");
    expect(day15Points).toHaveLength(1);
    expect(day15Points[0].balance).toBe(70_000);
  });

  it("先頭にanchor点・末尾にhorizonEnd点が入る", () => {
    const rows: ForecastRow[] = [makeRow({ date: "2026-07-15", balance: 90_000 })];
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows,
      today: "2026-07-12",
      horizonEnd: "2026-07-20",
    });
    expect(points[0]).toEqual({ date: "2026-07-12", balance: 100_000, isMonthMin: false });
    const last = points[points.length - 1];
    expect(last).toEqual({ date: "2026-07-20", balance: 90_000, isMonthMin: false });
  });

  it("最後のイベントがhorizonEndちょうどなら終端合成点は追加されない", () => {
    const rows: ForecastRow[] = [makeRow({ date: "2026-07-20", balance: 90_000 })];
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows,
      today: "2026-07-12",
      horizonEnd: "2026-07-20",
    });
    expect(points.filter((p) => p.date === "2026-07-20")).toHaveLength(1);
    expect(points[points.length - 1]).toEqual({ date: "2026-07-20", balance: 90_000, isMonthMin: true });
  });

  it("todayにイベントが無い場合、直前残高でtoday合成点が挿入される", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-07-13", balance: 90_000 }),
      makeRow({ date: "2026-07-18", balance: 60_000 }),
    ];
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows,
      today: "2026-07-15",
      horizonEnd: "2026-07-20",
    });
    const todayPoint = points.find((p) => p.date === "2026-07-15");
    expect(todayPoint).toEqual({ date: "2026-07-15", balance: 90_000, isMonthMin: false });
    // 順序も保たれている
    expect(points.map((p) => p.date)).toEqual([
      "2026-07-12",
      "2026-07-13",
      "2026-07-15",
      "2026-07-18",
      "2026-07-20",
    ]);
  });

  it("todayにイベントがある場合はtoday合成点を挿入しない", () => {
    const rows: ForecastRow[] = [makeRow({ date: "2026-07-15", balance: 60_000 })];
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows,
      today: "2026-07-15",
      horizonEnd: "2026-07-20",
    });
    expect(points.filter((p) => p.date === "2026-07-15")).toHaveLength(1);
  });

  it("anchorDate === today ならtoday合成点を挿入しない", () => {
    const rows: ForecastRow[] = [makeRow({ date: "2026-07-15", balance: 60_000 })];
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows,
      today: "2026-07-12",
      horizonEnd: "2026-07-20",
    });
    expect(points.filter((p) => p.date === "2026-07-12")).toHaveLength(1);
  });

  it("isMonthMin: 各月で最小の点にだけ立つ。同値なら最初の点。合成点には立たない", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-07-13", balance: 80_000 }),
      makeRow({ date: "2026-07-14", balance: 50_000 }), // 7月最小(1個目)
      makeRow({ date: "2026-07-16", balance: 50_000 }), // 7月最小と同値だが2個目なのでfalse
      makeRow({ date: "2026-08-01", balance: 70_000 }),
      makeRow({ date: "2026-08-05", balance: 40_000 }), // 8月最小
    ];
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows,
      today: "2026-07-12",
      horizonEnd: "2026-08-05",
    });
    const byDate = new Map(points.map((p) => [p.date, p]));
    expect(byDate.get("2026-07-12")?.isMonthMin).toBe(false); // anchor
    expect(byDate.get("2026-07-13")?.isMonthMin).toBe(false);
    expect(byDate.get("2026-07-14")?.isMonthMin).toBe(true);
    expect(byDate.get("2026-07-16")?.isMonthMin).toBe(false);
    expect(byDate.get("2026-08-01")?.isMonthMin).toBe(false);
    expect(byDate.get("2026-08-05")?.isMonthMin).toBe(true); // 終端イベントかつ最小
  });

  it("rowsが空でも[anchor点, today点, 終端点]が返る", () => {
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows: [],
      today: "2026-07-15",
      horizonEnd: "2026-07-20",
    });
    expect(points).toEqual([
      { date: "2026-07-12", balance: 100_000, isMonthMin: false },
      { date: "2026-07-15", balance: 100_000, isMonthMin: false },
      { date: "2026-07-20", balance: 100_000, isMonthMin: false },
    ]);
  });

  it("点はdate昇順を保証する（rowsが未ソートでも防御的に並べ替える）", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-07-18", balance: 60_000 }),
      makeRow({ date: "2026-07-13", balance: 90_000 }),
    ];
    const points = buildBalanceSeries({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      rows,
      today: "2026-07-12",
      horizonEnd: "2026-07-20",
    });
    const dates = points.map((p) => p.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });
});
