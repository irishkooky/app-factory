import { describe, expect, it } from "vitest";
import {
  buildCheckRows,
  checkTargets,
  initialTarget,
  isQuarterEnd,
  nextQuarterEnd,
  QUARTERS_AHEAD,
  shiftQuarterEnd,
  type ForecastSnapshot,
} from "./forecastSnapshot";

function snapshot(takenOn: string, balance: number, predicted: number[]): ForecastSnapshot {
  return {
    takenOn,
    balance,
    predictions: QUARTERS_AHEAD.map((n, i) => ({ date: shiftQuarterEnd(takenOn, n), balance: predicted[i] })),
  };
}

describe("quarter-end math", () => {
  it("recognizes only the last day of Mar/Jun/Sep/Dec", () => {
    expect(isQuarterEnd("2026-03-31")).toBe(true);
    expect(isQuarterEnd("2026-06-30")).toBe(true);
    expect(isQuarterEnd("2026-09-30")).toBe(true);
    expect(isQuarterEnd("2026-12-31")).toBe(true);
    expect(isQuarterEnd("2026-12-30")).toBe(false);
    expect(isQuarterEnd("2026-10-31")).toBe(false);
    expect(isQuarterEnd("2026-04-01")).toBe(false);
  });

  it("shifts to the month end, not a day-clamped date", () => {
    expect(shiftQuarterEnd("2026-09-30", 1)).toBe("2026-12-31");
    expect(shiftQuarterEnd("2026-12-31", 1)).toBe("2027-03-31");
    expect(shiftQuarterEnd("2027-03-31", 1)).toBe("2027-06-30");
    expect(shiftQuarterEnd("2026-09-30", 4)).toBe("2027-09-30");
    expect(shiftQuarterEnd("2027-12-31", -3)).toBe("2027-03-31");
    expect(shiftQuarterEnd("2027-06-30", -2)).toBe("2026-12-31");
  });

  it("finds the next quarter end on or after a date", () => {
    expect(nextQuarterEnd("2026-11-22")).toBe("2026-12-31");
    expect(nextQuarterEnd("2026-12-31")).toBe("2026-12-31");
    expect(nextQuarterEnd("2027-01-01")).toBe("2027-03-31");
    expect(nextQuarterEnd("2027-04-01")).toBe("2027-06-30");
  });
});

describe("buildCheckRows", () => {
  const year = [
    snapshot("2026-12-31", 1_000_000, [950_000, 1_100_000, 1_150_000, 1_200_000]),
    snapshot("2027-03-31", 960_000, [1_050_000, 1_100_000, 1_150_000, 1_300_000]),
    snapshot("2027-06-30", 1_040_000, [1_090_000, 1_080_000, 1_250_000, 1_280_000]),
    snapshot("2027-09-30", 1_100_000, [1_020_000, 1_200_000, 1_230_000, 1_260_000]),
    snapshot("2027-12-31", 990_000, [1_150_000, 1_180_000, 1_190_000, 1_210_000]),
  ];

  it("lines up the 1-year, 9-, 6-, 3-month predictions and the actual for a date", () => {
    const rows = buildCheckRows(year, "2027-12-31", "2028-01-10");
    expect(rows.map((r) => [r.monthsBefore, r.takenOn, r.balance, r.status])).toEqual([
      [12, "2026-12-31", 1_200_000, "recorded"],
      [9, "2027-03-31", 1_150_000, "recorded"],
      [6, "2027-06-30", 1_080_000, "recorded"],
      [3, "2027-09-30", 1_020_000, "recorded"],
      [0, "2027-12-31", 990_000, "recorded"],
    ]);
  });

  it("marks values before the first record and values not yet due", () => {
    const rows = buildCheckRows(year.slice(0, 1), "2027-03-31", "2027-01-15");
    expect(rows.map((r) => [r.monthsBefore, r.balance, r.status])).toEqual([
      [12, null, "beforeStart"],
      [9, null, "beforeStart"],
      [6, null, "beforeStart"],
      [3, 950_000, "recorded"],
      [0, null, "upcoming"],
    ]);
  });

  it("treats today's quarter end as upcoming until the record lands", () => {
    const rows = buildCheckRows(year.slice(0, 1), "2027-03-31", "2027-03-31");
    expect(rows[4].status).toBe("upcoming");
  });

  it("marks a skipped quarter after recording started as missed", () => {
    const withGap = [year[0], year[2], year[3], year[4]];
    const rows = buildCheckRows(withGap, "2027-12-31", "2028-01-10");
    expect(rows[1]).toMatchObject({ monthsBefore: 9, takenOn: "2027-03-31", balance: null, status: "missed" });
  });
});

describe("targets", () => {
  it("spans from 3 months after the first record to 12 months after the latest", () => {
    const snaps = [snapshot("2026-12-31", 1, [1, 2, 3, 4]), snapshot("2027-03-31", 1, [1, 2, 3, 4])];
    expect(checkTargets(snaps)).toEqual([
      "2027-03-31",
      "2027-06-30",
      "2027-09-30",
      "2027-12-31",
      "2028-03-31",
    ]);
  });

  it("opens the latest date that has an actual balance", () => {
    const snaps = [snapshot("2026-12-31", 1, [1, 2, 3, 4]), snapshot("2027-03-31", 1, [1, 2, 3, 4])];
    expect(initialTarget(snaps, checkTargets(snaps), "2027-05-01")).toBe("2027-03-31");
  });

  it("falls back to the nearest upcoming date when nothing has an actual yet", () => {
    const snaps = [snapshot("2026-12-31", 1, [1, 2, 3, 4])];
    expect(initialTarget(snaps, checkTargets(snaps), "2027-01-05")).toBe("2027-03-31");
    expect(initialTarget([], [], "2027-01-05")).toBeNull();
  });
});
