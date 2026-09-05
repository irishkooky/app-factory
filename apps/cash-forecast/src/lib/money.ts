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

// 金額入力欄（MoneyField）向け: 入力中の生文字列をリアルタイムでカンマ区切りに整形する。

const DEFAULT_MAX_VALUE = 1_000_000_000;

// 全角マイナス(U+2212)・長音記号(U+30FC)・全角ハイフン(U+FF0D)も "-" として扱う。
const MINUS_LIKE_CHARS = /[−ー－]/g;

// 半角ピリオド(.)・全角ピリオド(U+FF0E)を小数点として扱う。
const DECIMAL_POINT_CHARS = /[.．]/;

export type MoneyInputOptions = {
  /** 負数の入力を許すか（残高フィールド用）。既定 false */
  allowNegative?: boolean;
  /** 絶対値の上限。既定 1_000_000_000 */
  maxValue?: number;
};

export type MoneyInputResult = {
  /** 入力欄に表示する文字列。カンマ区切り・通貨記号は含まない（例 "1,000,000" / "-1,234" / "" / "-"） */
  display: string;
  /** 整数円。空入力なら undefined */
  value: number | undefined;
};

/**
 * 入力中の生文字列を、カンマ区切りの表示文字列と整数値に正規化する。
 * 小数部は切り捨てる（四捨五入すると入力途中の値が跳ねて混乱するため）。
 */
export function formatMoneyInput(raw: string, options?: MoneyInputOptions): MoneyInputResult {
  const allowNegative = options?.allowNegative ?? false;
  const maxValue = options?.maxValue ?? DEFAULT_MAX_VALUE;

  const normalized = toHankaku(raw).replace(MINUS_LIKE_CHARS, "-");
  const negative = allowNegative && normalized.trim().startsWith("-");

  // 小数点以降は切り捨てる。数字以外を除去する前に、最初の小数点の位置で切ること
  // （でないと "1234.56" の "." が消えて "123456" と桁数が変わってしまう）。
  const decimalIdx = normalized.search(DECIMAL_POINT_CHARS);
  const truncated = decimalIdx === -1 ? normalized : normalized.slice(0, decimalIdx);

  const digitsRaw = truncated.replace(/[^\d]/g, "");
  const digits = digitsRaw.replace(/^0+(?=\d)/, "");

  if (digits === "") {
    return { display: negative ? "-" : "", value: undefined };
  }

  let n = Number(digits);
  if (n > maxValue) {
    n = maxValue;
  }

  if (n === 0) {
    // -0 を作らない。
    return { display: "0", value: 0 };
  }

  const display = (negative ? "-" : "") + n.toLocaleString("ja-JP");
  return { display, value: negative ? -n : n };
}

/** 数値を入力欄の表示文字列に変換する（undefined -> ""）。 */
export function toMoneyInputDisplay(value: number | undefined): string {
  if (value === undefined) return "";
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString("ja-JP");
  return rounded < 0 ? `-${abs}` : abs;
}

/** 文字列に含まれる数字（半角・全角）の個数を数える。キャレット位置の復元に使う。 */
export function countMoneyDigits(raw: string): number {
  const matches = toHankaku(raw).match(/\d/g);
  return matches ? matches.length : 0;
}

/**
 * display の先頭から数えて digitCount 個目の数字の直後の位置を返す（キャレット復元用）。
 * digitCount が 0 以下のときは最初の数字の直前の位置（数字が無ければ末尾）。
 */
export function caretAfterDigits(display: string, digitCount: number): number {
  if (digitCount <= 0) {
    const idx = display.search(/\d/);
    return idx === -1 ? display.length : idx;
  }
  let seen = 0;
  for (let i = 0; i < display.length; i++) {
    if (/\d/.test(display[i])) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return display.length;
}
