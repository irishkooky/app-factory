// 予測チェックポイントの純粋ドメイン。Convex と UI の両方から使う。
import { addMonthsToDateClamped } from "./date";

export const MAX_IN_PROGRESS_SERIES = 4;

export type SeriesStatus = "in_progress" | "reached";
export type SeriesSource = "quarter" | "manual";
export type ObservationKind = "forecast" | "actual";
export type ObservationSlot = "m0" | "m3" | "m6" | "m9" | "actual";

export const FORECAST_SLOTS: ObservationSlot[] = ["m0", "m3", "m6", "m9"];

const QUARTER_START_MONTHS = [1, 4, 7, 10] as const;

/** その日が属する四半期の初日（1/1・4/1・7/1・10/1）。 */
export function quarterStartOf(yyyyMmDd: string): string {
  const year = Number(yyyyMmDd.slice(0, 4));
  const month = Number(yyyyMmDd.slice(5, 7));
  let startMonth = 1;
  for (const candidate of QUARTER_START_MONTHS) {
    if (month >= candidate) startMonth = candidate;
  }
  return `${year}-${String(startMonth).padStart(2, "0")}-01`;
}

/** 今日が四半期初日ならその日、否则 null。 */
export function isQuarterStart(yyyyMmDd: string): boolean {
  return yyyyMmDd === quarterStartOf(yyyyMmDd);
}

/** シリーズ開始日のちょうど1年後（日クランプ）。 */
export function targetDateFromStart(startedAt: string): string {
  return addMonthsToDateClamped(startedAt, 12);
}

/** スロットの予定日。actual は targetDate。 */
export function dueDateForSlot(startedAt: string, targetDate: string, slot: ObservationSlot): string {
  switch (slot) {
    case "m0":
      return startedAt;
    case "m3":
      return addMonthsToDateClamped(startedAt, 3);
    case "m6":
      return addMonthsToDateClamped(startedAt, 6);
    case "m9":
      return addMonthsToDateClamped(startedAt, 9);
    case "actual":
      return targetDate;
  }
}

/** today 時点で記録すべきスロット一覧（dueDate <= today）。 */
export function dueSlots(startedAt: string, targetDate: string, today: string): ObservationSlot[] {
  const slots: ObservationSlot[] = [...FORECAST_SLOTS, "actual"];
  return slots.filter((slot) => dueDateForSlot(startedAt, targetDate, slot) <= today);
}

export function kindForSlot(slot: ObservationSlot): ObservationKind {
  return slot === "actual" ? "actual" : "forecast";
}

export type CheckpointObservationView = {
  slot: ObservationSlot;
  observedAt: string;
  dueDate: string;
  predictedBalanceAtTarget: number;
  balanceToday: number;
  kind: ObservationKind;
};

export type CheckpointSeriesView = {
  startedAt: string;
  targetDate: string;
  status: SeriesStatus;
  source: SeriesSource;
  observations: CheckpointObservationView[];
};

/** 要約: 最初の予測と最新の予測の差分（actual は除外）。観測が1点未満なら null。 */
export function summarizeSeries(series: CheckpointSeriesView): {
  firstPredicted: number;
  latestPredicted: number;
  delta: number;
  latestObservedAt: string;
  balanceToday: number;
} | null {
  const forecasts = series.observations.filter((o) => o.kind === "forecast");
  if (forecasts.length === 0) return null;
  const first = forecasts[0];
  const latest = forecasts[forecasts.length - 1];
  return {
    firstPredicted: first.predictedBalanceAtTarget,
    latestPredicted: latest.predictedBalanceAtTarget,
    delta: latest.predictedBalanceAtTarget - first.predictedBalanceAtTarget,
    latestObservedAt: latest.observedAt,
    balanceToday: latest.balanceToday,
  };
}
