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

// 金額入力欄（MoneyField）向け: 入力中は一切書き換えず、blur時などにパースだけ行う。

const DEFAULT_MAX_VALUE = 1_000_000_000;

// 全角マイナス(U+2212)・長音記号(U+30FC)・全角ハイフン(U+FF0D)も "-" として扱う。
const MINUS_LIKE_CHARS = /[−ー－]/g;

// 半角ピリオド(.)・全角ピリオド(U+FF0E)を小数点として扱う。
const DECIMAL_POINT_CHARS = /[.．]/;

// 半角・全角(U+3000)空白。
const WHITESPACE_CHARS = /[\s　]/g;

// 桁区切りカンマ（半角・全角）・通貨記号・「円」。
const CURRENCY_CHARS = /[,，¥￥円]/g;

export type MoneyParseOptions = {
  /** 負数を許すか。既定 false */
  allowNegative?: boolean;
  /** 絶対値の上限。既定 1_000_000_000 */
  maxValue?: number;
};

export type MoneyParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: "empty" | "partial" | "format" | "negative" | "tooLarge" };

/**
 * 金額入力欄の生文字列を整数円にパースする。表示用の整形は一切しない。
 * カンマ・全角数字・¥/円・空白は寛容に受け付け、小数部は切り捨てる。
 */
export function parseMoneyInput(raw: string, options?: MoneyParseOptions): MoneyParseResult {
  const allowNegative = options?.allowNegative ?? false;
  const maxValue = options?.maxValue ?? DEFAULT_MAX_VALUE;

  const normalized = toHankaku(raw)
    .replace(MINUS_LIKE_CHARS, "-")
    .replace(WHITESPACE_CHARS, "")
    .replace(CURRENCY_CHARS, "");

  if (normalized === "") {
    return { ok: false, reason: "empty" };
  }

  // 小数点以降は切り捨てる。数字以外を除去する前に、最初の小数点の位置で切ること
  // （でないと "1234.56" の "." が消えて "123456" と桁数が変わってしまう）。
  const decimalIdx = normalized.search(DECIMAL_POINT_CHARS);
  const truncated = decimalIdx === -1 ? normalized : normalized.slice(0, decimalIdx);

  if (truncated === "") {
    return { ok: false, reason: "format" };
  }
  if (truncated === "-") {
    // 負数を打ち始めた途中（"-" だけ）。allowNegative でなければ数字が無いだけの format 扱い。
    return { ok: false, reason: allowNegative ? "partial" : "format" };
  }
  if (!/^-?\d+$/.test(truncated)) {
    return { ok: false, reason: "format" };
  }

  const negative = truncated.startsWith("-");
  if (negative && !allowNegative) {
    return { ok: false, reason: "negative" };
  }

  const abs = Number(negative ? truncated.slice(1) : truncated);
  if (abs > maxValue) {
    return { ok: false, reason: "tooLarge" };
  }

  const value = negative ? -abs : abs;
  // -0 を作らない（"-0" 入力時に abs=0 で -abs が -0 になるのを防ぐ）。
  return { ok: true, value: Object.is(value, -0) ? 0 : value };
}

/** 数値を入力欄の正規化テキストにする（undefined → ""、1234 → "1234"、-2500 → "-2500"。小数は四捨五入） */
export function toMoneyInputText(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  // Math.round(-0.x) は -0 になりうるが、String(-0) は "0" になるため "-0" 表記は発生しない。
  return String(Math.round(value));
}

/**
 * パース失敗理由をユーザー向け文言にする。
 * 'empty'（未入力）と 'partial'（"-" だけ等、入力途中の一時的な不正状態）は undefined
 * （どちらもフィールド側のエラーとしては出さない）。
 */
export function moneyInputErrorMessage(
  reason: Exclude<MoneyParseResult, { ok: true }>["reason"],
): string | undefined {
  switch (reason) {
    case "format":
      return "半角数字で入力してください";
    case "negative":
      return "0以上の金額を入力してください";
    case "tooLarge":
      return "10億円以下で入力してください";
    case "empty":
    case "partial":
      return undefined;
  }
}
