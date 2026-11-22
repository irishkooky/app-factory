// 予測の答え合わせの純粋ドメイン。Convex（記録）と UI（表示）の両方から使う。
// 四半期末ごとに1回、その日の残高と 3・6・9・12か月先の四半期末の予測残高をまとめて1件保存する。
// ある四半期末 T の「1年前・9か月前・6か月前・3か月前の予測」は、T の 12・9・6・3か月前の記録から引ける。
import { addMonths, clampedDateInMonth, monthOf } from "./date";

export type ForecastSnapshot = {
  takenOn: string; // 記録した四半期末 "YYYY-MM-DD"
  balance: number; // takenOn 時点の残高
  predictions: { date: string; balance: number }[]; // 1〜4四半期先の四半期末と、その日の予測残高
};

/** 1回の記録で予測を残す先（何四半期先か）。 */
export const QUARTERS_AHEAD = [1, 2, 3, 4] as const;

const MONTHS_BEFORE = [12, 9, 6, 3] as const;

function monthEnd(yyyyMm: string): string {
  return clampedDateInMonth(yyyyMm, 31);
}

/** 3/31・6/30・9/30・12/31 のいずれかか。 */
export function isQuarterEnd(date: string): boolean {
  return Number(date.slice(5, 7)) % 3 === 0 && date === monthEnd(monthOf(date));
}

/**
 * 四半期末から n 四半期ずらした四半期末（n は負でもよい）。
 * 日のクランプで足すと 9/30 + 3か月 = 12/30 になるので、移動先の月の末日を取る。
 */
export function shiftQuarterEnd(quarterEnd: string, n: number): string {
  return monthEnd(addMonths(monthOf(quarterEnd), n * 3));
}

/** date 以降で最初の四半期末（date 自身が四半期末ならその日）。 */
export function nextQuarterEnd(date: string): string {
  const quarterLastMonth = Math.ceil(Number(date.slice(5, 7)) / 3) * 3;
  return monthEnd(`${date.slice(0, 4)}-${String(quarterLastMonth).padStart(2, "0")}`);
}

/**
 * 答え合わせの1行。monthsBefore = 0 が「実際」。
 * status: recorded = 値あり / upcoming = takenOn がまだ来ていない（当日の記録前を含む）/
 * missed = 記録を始めた後なのに取りこぼした / beforeStart = 記録を始める前の分
 */
export type CheckRow = {
  monthsBefore: 12 | 9 | 6 | 3 | 0;
  takenOn: string;
  balance: number | null;
  status: "recorded" | "upcoming" | "missed" | "beforeStart";
};

export function buildCheckRows(snapshots: ForecastSnapshot[], target: string, today: string): CheckRow[] {
  const byTakenOn = new Map(snapshots.map((s) => [s.takenOn, s]));
  const firstTakenOn = snapshots.reduce<string | null>(
    (min, s) => (min === null || s.takenOn < min ? s.takenOn : min),
    null,
  );

  const row = (monthsBefore: CheckRow["monthsBefore"], takenOn: string, balance: number | null): CheckRow => ({
    monthsBefore,
    takenOn,
    balance,
    status:
      balance !== null
        ? "recorded"
        : takenOn >= today
          ? "upcoming"
          : firstTakenOn === null || takenOn < firstTakenOn
            ? "beforeStart"
            : "missed",
  });

  const rows = MONTHS_BEFORE.map((monthsBefore) => {
    const takenOn = shiftQuarterEnd(target, -monthsBefore / 3);
    const predicted = byTakenOn.get(takenOn)?.predictions.find((p) => p.date === target);
    return row(monthsBefore, takenOn, predicted?.balance ?? null);
  });
  rows.push(row(0, target, byTakenOn.get(target)?.balance ?? null));
  return rows;
}

/** 左右で切り替えられる日付（昇順）。どれかの記録が予測先にしている四半期末。 */
export function checkTargets(snapshots: ForecastSnapshot[]): string[] {
  const dates = new Set<string>();
  for (const snapshot of snapshots) {
    for (const prediction of snapshot.predictions) dates.add(prediction.date);
  }
  return [...dates].sort();
}

/** 最初に開く日付。「実際」がある最新の日付、無ければ today 以降で最も近い日付。 */
export function initialTarget(snapshots: ForecastSnapshot[], targets: string[], today: string): string | null {
  const takenOn = new Set(snapshots.map((s) => s.takenOn));
  const withActual = targets.filter((t) => takenOn.has(t));
  if (withActual.length > 0) return withActual[withActual.length - 1];
  return targets.find((t) => t >= today) ?? targets[targets.length - 1] ?? null;
}
