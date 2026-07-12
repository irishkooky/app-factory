// 通貨は円・整数のみを扱う。

/** 整数円を "¥1,234,567" / 負数は "-¥1,234" の形式に整形する。 */
export function formatYen(n: number): string {
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString("ja-JP");
  return n < 0 ? `-¥${formatted}` : `¥${formatted}`;
}

const ZENKAKU_DIGITS = "０１２３４５６７８９";

function toHankaku(input: string): string {
  return input.replace(/[０-９]/g, (ch) => String(ZENKAKU_DIGITS.indexOf(ch)));
}

/**
 * カンマ区切り・全角数字を許容して整数円にパースする。
 * 不正な入力（数値にならない、負数、非有限値など）は null を返す。
 */
export function parseYen(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input);
  }

  const normalized = toHankaku(input.trim()).replace(/,/g, "").replace(/¥/g, "");
  if (normalized === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}
