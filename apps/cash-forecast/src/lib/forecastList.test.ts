import { describe, expect, it } from "vitest";
import type { ForecastRow } from "./forecast";
import { buildForecastListItems, currentPosition, lowestBalanceAhead } from "./forecastList";

let rowSeq = 0;
function makeRow(overrides: Partial<ForecastRow> & Pick<ForecastRow, "date" | "kind" | "amount">): ForecastRow {
  rowSeq += 1;
  return {
    key: `row_${rowSeq}`,
    name: "テスト行",
    balance: 0,
    isVirtual: false,
    belowThreshold: false,
    ...overrides,
  };
}

describe("currentPosition / buildForecastListItems", () => {
  it("今日に行があるとき: 過去行は出さず、todayマーカーは当日行の直後・当日行だけisToday、positionは当日最後の行の値", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-27", kind: "expense", amount: 1000, balance: 5000 }),
      makeRow({ date: "2026-08-29", kind: "income", amount: 2000, balance: 7000 }),
      makeRow({ date: "2026-08-29", kind: "expense", amount: 500, balance: 6500 }),
      makeRow({ date: "2026-09-02", kind: "expense", amount: 300, balance: 6200 }),
    ];
    const input = { rows, today: "2026-08-29", anchorDate: "2026-08-01", anchorBalance: 0 };

    const position = currentPosition(input);
    expect(position.balance).toBe(6500);
    expect(position.asOfDate).toBe("2026-08-29");
    expect(position.hasTodayRows).toBe(true);

    const items = buildForecastListItems(input);
    const types = items.map((item) => (item.type === "row" ? `row:${item.row.date}` : item.type));
    expect(types).toEqual([
      "month",
      "row:2026-08-29",
      "row:2026-08-29",
      "today",
      "month",
      "row:2026-09-02",
    ]);

    // 今日より前の行はメインに出さない
    expect(items.some((item) => item.type === "row" && item.row.date === "2026-08-27")).toBe(false);

    const rowItems = items.filter((item) => item.type === "row");
    expect(rowItems.map((item) => item.isToday)).toEqual([true, true, false]);
  });

  it("今日に行が無いとき: todayマーカーのあと翌月見出し・行", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-28", kind: "expense", amount: 1000, balance: 4000 }),
      makeRow({ date: "2026-09-02", kind: "income", amount: 2000, balance: 6000 }),
    ];
    const input = { rows, today: "2026-08-30", anchorDate: "2026-08-01", anchorBalance: 0 };

    const position = currentPosition(input);
    expect(position.asOfDate).toBe("2026-08-28");
    expect(position.hasTodayRows).toBe(false);

    const items = buildForecastListItems(input);
    const types = items.map((item) => (item.type === "row" ? `row:${item.row.date}` : item.type));
    expect(types).toEqual(["today", "month", "row:2026-09-02"]);
  });

  it("今日が月末で次の行が翌月のとき: today, 翌月見出し, 翌月行の順になる", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-25", kind: "expense", amount: 1000, balance: 4000 }),
      makeRow({ date: "2026-09-02", kind: "income", amount: 2000, balance: 6000 }),
    ];
    const input = { rows, today: "2026-08-31", anchorDate: "2026-08-01", anchorBalance: 0 };

    const items = buildForecastListItems(input);
    const types = items.map((item) => (item.type === "row" ? `row:${item.row.date}` : item.type));
    expect(types).toEqual(["today", "month", "row:2026-09-02"]);
  });

  it("全行が未来のとき: マーカーは先頭（最初の月見出しより前）、positionはanchorの値", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-05", kind: "expense", amount: 1000, balance: -1000 }),
      makeRow({ date: "2026-08-10", kind: "income", amount: 500, balance: -500 }),
    ];
    const input = { rows, today: "2026-08-01", anchorDate: "2026-07-01", anchorBalance: 1000 };

    const position = currentPosition(input);
    expect(position.balance).toBe(1000);
    expect(position.asOfDate).toBe("2026-07-01");
    expect(position.hasTodayRows).toBe(false);

    const items = buildForecastListItems(input);
    expect(items[0]).toMatchObject({ type: "today" });
    expect(items.some((item) => item.type === "month")).toBe(true);
  });

  it("全行が過去（today以前）のとき: items が [today] の1件になる", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-07-05", kind: "expense", amount: 1000, balance: -1000 }),
      makeRow({ date: "2026-07-10", kind: "income", amount: 500, balance: -500 }),
    ];
    const input = { rows, today: "2026-08-01", anchorDate: "2026-07-01", anchorBalance: 1000 };

    const items = buildForecastListItems(input);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: "today" });
  });

  it("rowsが空のとき: マーカー1件のみ、positionはanchorの値", () => {
    const input = { rows: [], today: "2026-08-01", anchorDate: "2026-07-01", anchorBalance: 1000 };

    const items = buildForecastListItems(input);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: "today" });

    const position = currentPosition(input);
    expect(position).toEqual({ balance: 1000, asOfDate: "2026-07-01", hasTodayRows: false });
  });

  it("同日に複数行あるとき: positionのbalanceはその日の最後の行の値になる", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-10", kind: "income", amount: 1000, balance: 1000 }),
      makeRow({ date: "2026-08-10", kind: "expense", amount: 300, balance: 700 }),
      makeRow({ date: "2026-08-10", kind: "expense", amount: 200, balance: 500 }),
    ];
    const input = { rows, today: "2026-08-10", anchorDate: "2026-08-01", anchorBalance: 0 };

    const position = currentPosition(input);
    expect(position.balance).toBe(500);
    expect(position.asOfDate).toBe("2026-08-10");
  });

  it("異常データ（anchorDateがtodayより後になった等）でも破綻せず、anchorの値がそのまま返る", () => {
    // rows は forecast 由来なので date > anchorDate のものしか無いはずで、
    // anchorDate > today ならどの行も date > today になり、today以前の行は存在しない。
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-15", kind: "expense", amount: 500, balance: 9_500 }),
    ];
    const input = { rows, today: "2026-08-01", anchorDate: "2026-08-10", anchorBalance: 10_000 };

    const position = currentPosition(input);
    expect(position.balance).toBe(10_000);
    expect(position.asOfDate).toBe("2026-08-10");
    expect(position.hasTodayRows).toBe(false);
  });

  it("今日当日の行はrowアイテム(isToday=true)として出る", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-09", kind: "expense", amount: 100 }),
      makeRow({ date: "2026-08-10", kind: "income", amount: 200 }),
    ];
    const input = { rows, today: "2026-08-10", anchorDate: "2026-08-01", anchorBalance: 0 };

    const items = buildForecastListItems(input);
    expect(items.some((item) => item.type === "row" && item.row.date === "2026-08-09")).toBe(false);

    const todayRow = items.find((item) => item.type === "row" && item.row.date === "2026-08-10");
    expect(todayRow).toMatchObject({ type: "row", isToday: true });
  });
});

describe("lowestBalanceAhead", () => {
  it("today以降の行から最低残高を選び、同値なら最初の行の日付を返す", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-20", kind: "expense", amount: 9000, balance: -1000 }),
      makeRow({ date: "2026-08-30", kind: "expense", amount: 1000, balance: 3000 }),
      makeRow({ date: "2026-09-10", kind: "income", amount: 5000, balance: 8000 }),
      makeRow({ date: "2026-09-27", kind: "expense", amount: 5000, balance: 3000 }),
    ];
    expect(lowestBalanceAhead(rows, "2026-08-30", 4000)).toEqual({ balance: 3000, date: "2026-08-30" });
  });

  it("today以降に行が無ければ全行から、行が無ければ現在残高と今日を返す", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-20", kind: "expense", amount: 9000, balance: -1000 }),
      makeRow({ date: "2026-08-25", kind: "income", amount: 2000, balance: 1000 }),
    ];
    expect(lowestBalanceAhead(rows, "2026-09-01", 1000)).toEqual({ balance: -1000, date: "2026-08-20" });
    expect(lowestBalanceAhead([], "2026-09-01", 1000)).toEqual({ balance: 1000, date: "2026-09-01" });
  });
});
