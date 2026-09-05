import { describe, expect, it } from "vitest";
import { countMoneyDigits, formatMoneyInput, toMoneyInputDisplay } from "./money";

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
