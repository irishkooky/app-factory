import { describe, expect, it } from "vitest";
import type { ForecastRow } from "./forecast";
import { buildForecastListItems, currentPosition } from "./forecastList";

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
  it("今日に行があるとき: today以前の行はpastに畳まれ、todayマーカーは当日行の直後・当日行だけisToday、positionは当日最後の行の値", () => {
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
      "past",
      "month",
      "row:2026-08-29",
      "row:2026-08-29",
      "today",
      "month",
      "row:2026-09-02",
    ]);

    // 今日より前の8/27はpastに畳まれる（rowアイテムとしては出ない）。当日行だけがisToday=true。
    const pastItem = items[0];
    if (pastItem.type !== "past") throw new Error("expected past item first");
    expect(pastItem.rows.map((r) => r.date)).toEqual(["2026-08-27"]);

    const rowItems = items.filter((item) => item.type === "row");
    expect(rowItems.map((item) => item.isToday)).toEqual([true, true, false]);
  });

  it("今日に行が無いとき: pastに直近の過去行が入り、todayマーカーはその後・翌月見出しの前", () => {
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
    expect(types).toEqual(["past", "today", "month", "row:2026-09-02"]);

    const pastItem = items[0];
    if (pastItem.type !== "past") throw new Error("expected past item first");
    expect(pastItem.rows.map((r) => r.date)).toEqual(["2026-08-28"]);
  });

  it("今日が月末で次の行が翌月のとき: past, today, 翌月見出し, 翌月行の順になる", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-25", kind: "expense", amount: 1000, balance: 4000 }),
      makeRow({ date: "2026-09-02", kind: "income", amount: 2000, balance: 6000 }),
    ];
    const input = { rows, today: "2026-08-31", anchorDate: "2026-08-01", anchorBalance: 0 };

    const items = buildForecastListItems(input);
    const types = items.map((item) => (item.type === "row" ? `row:${item.row.date}` : item.type));
    expect(types).toEqual(["past", "today", "month", "row:2026-09-02"]);
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

  it("全行が過去（today以前）のとき: items が [past, today] の2件になる", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-07-05", kind: "expense", amount: 1000, balance: -1000 }),
      makeRow({ date: "2026-07-10", kind: "income", amount: 500, balance: -500 }),
    ];
    const input = { rows, today: "2026-08-01", anchorDate: "2026-07-01", anchorBalance: 1000 };

    const items = buildForecastListItems(input);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ type: "past" });
    expect(items[1]).toMatchObject({ type: "today" });
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

  it("異常データ（OCR照合でanchorDateがtodayより後になった等）でも破綻せず、anchorの値がそのまま返る", () => {
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

  it("pastグループ: 元の順序を保ち、net(符号付き合計)とreviewCount(isVirtualの数)が正しい", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-07-05", kind: "income", amount: 1000 }),
      makeRow({ date: "2026-07-10", kind: "expense", amount: 300, isVirtual: true }),
      makeRow({ date: "2026-07-15", kind: "expense", amount: 200 }),
    ];
    const input = { rows, today: "2026-08-01", anchorDate: "2026-07-01", anchorBalance: 0 };

    const items = buildForecastListItems(input);
    const pastItem = items[0];
    if (pastItem.type !== "past") throw new Error("expected past item first");

    // 元の順序（date昇順）のまま保持されること
    expect(pastItem.rows.map((r) => r.date)).toEqual(["2026-07-05", "2026-07-10", "2026-07-15"]);
    // net = +1000 - 300 - 200 = 500
    expect(pastItem.net).toBe(500);
    // isVirtualでない過去行は数えない（isVirtualなのは1件だけ）
    expect(pastItem.reviewCount).toBe(1);
  });

  it("今日当日の行はpastに入らず、rowアイテム(isToday=true)として出る", () => {
    const rows: ForecastRow[] = [
      makeRow({ date: "2026-08-09", kind: "expense", amount: 100 }),
      makeRow({ date: "2026-08-10", kind: "income", amount: 200 }),
    ];
    const input = { rows, today: "2026-08-10", anchorDate: "2026-08-01", anchorBalance: 0 };

    const items = buildForecastListItems(input);
    const pastItem = items.find((item) => item.type === "past");
    if (pastItem?.type !== "past") throw new Error("expected a past item");
    expect(pastItem.rows.map((r) => r.date)).toEqual(["2026-08-09"]);

    const todayRow = items.find((item) => item.type === "row" && item.row.date === "2026-08-10");
    expect(todayRow).toMatchObject({ type: "row", isToday: true });
  });

  it("過去行が無いときはpastアイテム自体が出ない", () => {
    const rows: ForecastRow[] = [makeRow({ date: "2026-08-10", kind: "income", amount: 100 })];
    const input = { rows, today: "2026-08-01", anchorDate: "2026-07-01", anchorBalance: 0 };

    const items = buildForecastListItems(input);
    expect(items.some((item) => item.type === "past")).toBe(false);
  });
});
