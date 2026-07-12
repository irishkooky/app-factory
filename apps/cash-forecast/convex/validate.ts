// サーバー側バリデーションの共通ヘルパー。違反時は日本語メッセージで throw する。

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const MAX_AMOUNT = 1_000_000_000;

export function assertAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0 || amount > MAX_AMOUNT) {
    throw new Error("金額は0円以上10億円以下の整数で入力してください");
  }
}

export function assertAnchorBalance(anchorBalance: number): void {
  if (!Number.isInteger(anchorBalance) || Math.abs(anchorBalance) > MAX_AMOUNT) {
    throw new Error("残高は絶対値10億円以下の整数で入力してください");
  }
}

export function assertThreshold(threshold: number): void {
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error("しきい値は0以上の整数で入力してください");
  }
}

export function assertDayOfMonth(dayOfMonth: number): void {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error("日は1から31の整数で入力してください");
  }
}

export function assertDateString(date: string, label = "日付"): void {
  if (!DATE_RE.test(date)) {
    throw new Error(`${label}の形式が正しくありません`);
  }
}

export function assertMonthString(month: string): void {
  if (!MONTH_RE.test(month)) {
    throw new Error("対象月の形式が正しくありません");
  }
}

export function assertName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new Error("名前は1文字以上100文字以内で入力してください");
  }
  return trimmed;
}
