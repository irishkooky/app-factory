import { describe, expect, it } from "vitest";
import { caretAfterDigits, countMoneyDigits, formatMoneyInput, toMoneyInputDisplay } from "./money";

describe("formatMoneyInput", () => {
  it("そのまま整数: '1000000' → 1,000,000 / 1000000", () => {
    expect(formatMoneyInput("1000000")).toEqual({ display: "1,000,000", value: 1000000 });
  });

  it("カンマ入り文字列の再入力でも壊れない: '1,00' → 100 / 100", () => {
    expect(formatMoneyInput("1,00")).toEqual({ display: "100", value: 100 });
  });

  it("全角数字: '０１２３' → 123 / 123", () => {
    expect(formatMoneyInput("０１２３")).toEqual({ display: "123", value: 123 });
  });

  it("数字を含まない入力は空扱い: 'abc'", () => {
    expect(formatMoneyInput("abc")).toEqual({ display: "", value: undefined });
  });

  it("空文字も空扱い: ''", () => {
    expect(formatMoneyInput("")).toEqual({ display: "", value: undefined });
  });

  it("allowNegative: true で先頭の '-' を負数として扱う", () => {
    expect(formatMoneyInput("-500", { allowNegative: true })).toEqual({ display: "-500", value: -500 });
  });

  it("allowNegative 省略（false）では '-' を捨てる", () => {
    expect(formatMoneyInput("-500")).toEqual({ display: "500", value: 500 });
  });

  it("'-' だけの入力は打った直後として保持する（value は undefined）", () => {
    expect(formatMoneyInput("-", { allowNegative: true })).toEqual({ display: "-", value: undefined });
  });

  it("上限超過はクリップする（既定上限 1,000,000,000）", () => {
    expect(formatMoneyInput("9999999999")).toEqual({ display: "1,000,000,000", value: 1000000000 });
  });

  it("'-0' は -0 を作らず 0 として扱う", () => {
    expect(formatMoneyInput("-0", { allowNegative: true })).toEqual({ display: "0", value: 0 });
  });

  it("先頭の余分なゼロは落とす: '007' → 7 / 7", () => {
    expect(formatMoneyInput("007")).toEqual({ display: "7", value: 7 });
  });

  it("全角マイナス（U+2212）も負数として扱う", () => {
    expect(formatMoneyInput("−500", { allowNegative: true })).toEqual({ display: "-500", value: -500 });
  });

  it("長音記号・全角ハイフンも負数として扱う", () => {
    expect(formatMoneyInput("ー500", { allowNegative: true })).toEqual({ display: "-500", value: -500 });
    expect(formatMoneyInput("－500", { allowNegative: true })).toEqual({ display: "-500", value: -500 });
  });

  it("先頭以外の '-' は無視して捨てる", () => {
    expect(formatMoneyInput("12-34", { allowNegative: true })).toEqual({ display: "1,234", value: 1234 });
  });

  it("maxValue を指定できる", () => {
    expect(formatMoneyInput("500", { maxValue: 100 })).toEqual({ display: "100", value: 100 });
  });

  it("小数部は切り捨てる（四捨五入しない）: '1234.56' → 1,234 / 1234", () => {
    expect(formatMoneyInput("1234.56")).toEqual({ display: "1,234", value: 1234 });
  });

  it("小数部は切り捨てる: '1.5' → 1 / 1", () => {
    expect(formatMoneyInput("1.5")).toEqual({ display: "1", value: 1 });
  });

  it("カンマ入り小数も切り捨てる: '1,234.00' → 1,234 / 1234", () => {
    expect(formatMoneyInput("1,234.00")).toEqual({ display: "1,234", value: 1234 });
  });

  it("小数部切り捨ての結果 0 になる: '0.9' → 0 / 0", () => {
    expect(formatMoneyInput("0.9")).toEqual({ display: "0", value: 0 });
  });

  it("全角ピリオドも小数点として扱う: '1２．5' → 12 / 12", () => {
    expect(formatMoneyInput("1２．5")).toEqual({ display: "12", value: 12 });
  });

  it("数字以外の文字（'e'等）は無視する: '1e5' → 15 / 15", () => {
    expect(formatMoneyInput("1e5")).toEqual({ display: "15", value: 15 });
  });

  it("全角カンマも区切り文字として無視する: '１，２３４' → 1,234 / 1234", () => {
    expect(formatMoneyInput("１，２３４")).toEqual({ display: "1,234", value: 1234 });
  });

  it("前後の空白を無視して負数を判定する: '  -5  ' → -5 / -5", () => {
    expect(formatMoneyInput("  -5  ", { allowNegative: true })).toEqual({ display: "-5", value: -5 });
  });

  it("'-' が連続していても先頭にあれば負数として扱う: '--5' → -5 / -5", () => {
    expect(formatMoneyInput("--5", { allowNegative: true })).toEqual({ display: "-5", value: -5 });
  });

  it("'0' 単体はそのまま 0", () => {
    expect(formatMoneyInput("0")).toEqual({ display: "0", value: 0 });
  });

  it("負数側の上限クリップ: '-9999999999' → -1,000,000,000 / -1000000000", () => {
    expect(formatMoneyInput("-9999999999", { allowNegative: true })).toEqual({
      display: "-1,000,000,000",
      value: -1000000000,
    });
  });
});

describe("toMoneyInputDisplay", () => {
  it("undefined は空文字", () => {
    expect(toMoneyInputDisplay(undefined)).toBe("");
  });

  it("負数はマイナス付きカンマ区切り", () => {
    expect(toMoneyInputDisplay(-1234)).toBe("-1,234");
  });

  it("正数はカンマ区切り", () => {
    expect(toMoneyInputDisplay(1000000)).toBe("1,000,000");
  });

  it("0 は '0'", () => {
    expect(toMoneyInputDisplay(0)).toBe("0");
  });

  it("小数は四捨五入される", () => {
    expect(toMoneyInputDisplay(1234.6)).toBe("1,235");
  });
});

describe("countMoneyDigits", () => {
  it("全角数字も含めて数える: '1,23４' → 4", () => {
    expect(countMoneyDigits("1,23４")).toBe(4);
  });

  it("数字が無ければ0", () => {
    expect(countMoneyDigits("abc,-")).toBe(0);
  });

  it("空文字は0", () => {
    expect(countMoneyDigits("")).toBe(0);
  });
});

describe("caretAfterDigits", () => {
  it("digitCount が 0 のときは最初の数字の直前", () => {
    expect(caretAfterDigits("1,234", 0)).toBe(0);
  });

  it("数字が無い文字列で digitCount が 0 のときは末尾", () => {
    expect(caretAfterDigits("-", 0)).toBe(1);
  });

  it("空文字は常に末尾（0）", () => {
    expect(caretAfterDigits("", 0)).toBe(0);
    expect(caretAfterDigits("", 3)).toBe(0);
  });

  it("digitCount が全桁数を超えるときは末尾", () => {
    expect(caretAfterDigits("1,234", 99)).toBe(5);
  });

  it("'1,234' で digitCount=1 → カンマの手前（1の直後）", () => {
    expect(caretAfterDigits("1,234", 1)).toBe(1);
  });

  it("'1,234' で digitCount=2 → カンマの次の数字の直後", () => {
    expect(caretAfterDigits("1,234", 2)).toBe(3);
  });

  it("'1,234' で digitCount=4 → 末尾", () => {
    expect(caretAfterDigits("1,234", 4)).toBe(5);
  });
});
