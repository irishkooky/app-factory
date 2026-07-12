// 残高推移グラフ用のデータ整形。純粋関数のみ（Reactに依存しない）。
import type { ForecastRow } from "./forecast";

export type BalancePoint = {
  date: string; // "YYYY-MM-DD"
  balance: number; // その日の最終残高
  isMonthMin: boolean; // その暦月のイベント点の中で残高最小（同値なら最初の点）。合成点は常にfalse。
};

export function buildBalanceSeries(input: {
  anchorDate: string;
  anchorBalance: number;
  rows: ForecastRow[]; // buildForecast の出力
  today: string; // todayJST()
  horizonEnd: string;
}): BalancePoint[] {
  const { anchorDate, anchorBalance, rows, today, horizonEnd } = input;

  // 防御的にdate昇順へ安定ソートする（同日内の順序は保持し、最終行判定に使う）
  const sortedRows = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // 各日付の最後の行を1イベント点にする。Mapは挿入順を保持するため、
  // sortedRows を昇順に走査していけば eventByDate の反復順も昇順になる。
  const eventByDate = new Map<string, ForecastRow>();
  for (const row of sortedRows) {
    eventByDate.set(row.date, row);
  }
  const eventPoints: BalancePoint[] = [...eventByDate.entries()].map(([date, row]) => ({
    date,
    balance: row.balance,
    isMonthMin: false,
  }));

  // 暦月ごとの最低残高日を求める（イベント点のみが対象。同値なら最初の点）
  const monthMinDates = new Set<string>();
  const pointsByMonth = new Map<string, BalancePoint[]>();
  for (const point of eventPoints) {
    const month = point.date.slice(0, 7);
    const bucket = pointsByMonth.get(month);
    if (bucket) {
      bucket.push(point);
    } else {
      pointsByMonth.set(month, [point]);
    }
  }
  for (const bucket of pointsByMonth.values()) {
    let minPoint = bucket[0];
    for (const point of bucket) {
      if (point.balance < minPoint.balance) minPoint = point;
    }
    monthMinDates.add(minPoint.date);
  }

  // 先頭にanchor点、続けてイベント点を並べる
  const points: BalancePoint[] = [
    { date: anchorDate, balance: anchorBalance, isMonthMin: false },
    ...eventPoints,
  ];

  // today にイベントが無く、anchorDate < today ならtoday位置に合成点を挿入する
  const hasTodayEvent = points.some((point) => point.date === today);
  if (anchorDate < today && !hasTodayEvent) {
    let insertIndex = points.length;
    let prevBalance = anchorBalance;
    for (let i = 0; i < points.length; i++) {
      if (points[i].date < today) {
        prevBalance = points[i].balance;
      } else {
        insertIndex = i;
        break;
      }
    }
    points.splice(insertIndex, 0, { date: today, balance: prevBalance, isMonthMin: false });
  }

  // 最後の点が horizonEnd より前なら終端の合成点を追加する
  const last = points[points.length - 1];
  if (last.date < horizonEnd) {
    points.push({ date: horizonEnd, balance: last.balance, isMonthMin: false });
  }

  return points.map((point) => ({
    ...point,
    isMonthMin: monthMinDates.has(point.date),
  }));
}
