// ForecastList.tsx の表示リスト組み立てロジック（純粋関数のみ・Reactに依存しない）。
// 「今日」がリストのどこにあり、その時点の残高がいくつなのかを、行データから算出する。

import type { ForecastRow } from "./forecast";
import { monthOf } from "./date";

/** 「今」の残高と、その残高がどの時点のものかを表す。 */
export type CurrentPosition = {
  /** today 時点の残高。today 以前の最後の行の balance。行が無ければ anchorBalance。 */
  balance: number;
  /** balance を確定させた日付。today 当日に行が無ければ直近の行の日付、行が無ければ anchorDate。 */
  asOfDate: string;
  /** today 当日ちょうどの行が1件以上あるか。 */
  hasTodayRows: boolean;
};

export type ForecastListItem =
  | { type: "month"; key: string; month: string }
  | { type: "today"; key: "today"; today: string; position: CurrentPosition }
  | { type: "row"; key: string; row: ForecastRow; isToday: boolean };

/** today 時点の残高とその確定日を求める。 */
export function currentPosition(input: {
  rows: ForecastRow[];
  today: string;
  anchorDate: string;
  anchorBalance: number;
}): CurrentPosition {
  const { rows, today, anchorDate, anchorBalance } = input;

  let balance = anchorBalance;
  let asOfDate = anchorDate;
  let hasTodayRows = false;

  for (const row of rows) {
    // >= にすることで同日に複数行あっても配列順で最後の行が残る（＝正しい累積残高）。
    if (row.date <= today && row.date >= asOfDate) {
      balance = row.balance;
      asOfDate = row.date;
    }
    if (row.date === today) {
      hasTodayRows = true;
    }
  }

  return { balance, asOfDate, hasTodayRows };
}

/**
 * ForecastList 描画用のアイテム列を組み立てる。
 * 月見出し・「今日」マーカー・各行を、日付順を保ったまま並べる。
 */
export function buildForecastListItems(input: {
  rows: ForecastRow[];
  today: string;
  anchorDate: string;
  anchorBalance: number;
}): ForecastListItem[] {
  const { rows, today } = input;
  const position = currentPosition(input);

  const items: ForecastListItem[] = [];
  let currentMonth: string | null = null;
  let todayInserted = false;

  for (const row of rows) {
    // 【重要】月見出しより先に today マーカーを入れる。
    // そうしないと「今日が月末で次の行が翌月」のとき、今日マーカーが翌月の見出しの下に潜り込む。
    if (!todayInserted && row.date > today) {
      items.push({ type: "today", key: "today", today, position });
      todayInserted = true;
    }

    const month = monthOf(row.date);
    if (month !== currentMonth) {
      items.push({ type: "month", key: `month-${month}`, month });
      currentMonth = month;
    }
    items.push({ type: "row", key: row.key, row, isToday: row.date === today });
  }

  if (!todayInserted) {
    items.push({ type: "today", key: "today", today, position });
  }

  return items;
}
