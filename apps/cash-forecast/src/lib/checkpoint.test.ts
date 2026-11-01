import { describe, expect, it } from "vitest";
import {
  dueDateForSlot,
  dueSlots,
  isQuarterStart,
  kindForSlot,
  quarterStartOf,
  summarizeSeries,
  targetDateFromStart,
  type CheckpointSeriesView,
} from "./checkpoint";

describe("quarterStartOf", () => {
  it("maps mid-quarter days to the quarter start", () => {
    expect(quarterStartOf("2026-02-15")).toBe("2026-01-01");
    expect(quarterStartOf("2026-05-01")).toBe("2026-04-01");
    expect(quarterStartOf("2026-08-31")).toBe("2026-07-01");
    expect(quarterStartOf("2026-12-01")).toBe("2026-10-01");
  });

  it("keeps exact quarter starts", () => {
    expect(quarterStartOf("2026-01-01")).toBe("2026-01-01");
    expect(isQuarterStart("2026-04-01")).toBe(true);
    expect(isQuarterStart("2026-04-02")).toBe(false);
  });
});

describe("target and slots", () => {
  it("targets exactly one year after start with day clamp", () => {
    expect(targetDateFromStart("2026-01-01")).toBe("2027-01-01");
    expect(targetDateFromStart("2026-01-31")).toBe("2027-01-31");
  });

  it("schedules quarterly due dates", () => {
    const start = "2026-01-01";
    const target = targetDateFromStart(start);
    expect(dueDateForSlot(start, target, "m0")).toBe("2026-01-01");
    expect(dueDateForSlot(start, target, "m3")).toBe("2026-04-01");
    expect(dueDateForSlot(start, target, "m6")).toBe("2026-07-01");
    expect(dueDateForSlot(start, target, "m9")).toBe("2026-10-01");
    expect(dueDateForSlot(start, target, "actual")).toBe("2027-01-01");
    expect(kindForSlot("m3")).toBe("forecast");
    expect(kindForSlot("actual")).toBe("actual");
  });

  it("lists only slots that are due", () => {
    const start = "2026-01-01";
    const target = "2027-01-01";
    expect(dueSlots(start, target, "2025-12-31")).toEqual([]);
    expect(dueSlots(start, target, "2026-01-01")).toEqual(["m0"]);
    expect(dueSlots(start, target, "2026-07-01")).toEqual(["m0", "m3", "m6"]);
    expect(dueSlots(start, target, "2027-01-01")).toEqual(["m0", "m3", "m6", "m9", "actual"]);
  });
});

describe("summarizeSeries", () => {
  it("computes first vs latest forecast delta", () => {
    const series: CheckpointSeriesView = {
      startedAt: "2026-01-01",
      targetDate: "2027-01-01",
      status: "in_progress",
      source: "quarter",
      observations: [
        {
          slot: "m0",
          observedAt: "2026-01-01",
          dueDate: "2026-01-01",
          predictedBalanceAtTarget: 1_000_000,
          balanceToday: 500_000,
          kind: "forecast",
        },
        {
          slot: "m3",
          observedAt: "2026-04-01",
          dueDate: "2026-04-01",
          predictedBalanceAtTarget: 800_000,
          balanceToday: 520_000,
          kind: "forecast",
        },
      ],
    };
    const summary = summarizeSeries(series);
    expect(summary).toEqual({
      firstPredicted: 1_000_000,
      latestPredicted: 800_000,
      delta: -200_000,
      latestObservedAt: "2026-04-01",
      balanceToday: 520_000,
    });
  });

  it("returns null without forecast points", () => {
    expect(
      summarizeSeries({
        startedAt: "2026-01-01",
        targetDate: "2027-01-01",
        status: "reached",
        source: "quarter",
        observations: [],
      }),
    ).toBeNull();
  });
});
