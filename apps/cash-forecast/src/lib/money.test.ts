import { describe, expect, it } from "vitest";
import { moneyInputErrorMessage, parseMoneyInput, toMoneyInputText } from "./money";

describe("parseMoneyInput", () => {
  it("そのまま整数: '1000000' → ok 1000000", () => {
    expect(parseMoneyInput("1000000")).toEqual({ ok: true, value: 1000000 });
  });

  it("カンマ区切り: '1,000,000' → ok 1000000", () => {
    expect(parseMoneyInput("1,000,000")).toEqual({ ok: true, value: 1000000 });
  });

  it("¥記号: '¥1,234' → ok 1234", () => {
    expect(parseMoneyInput("¥1,234")).toEqual({ ok: true, value: 1234 });
  });

  it("「円」表記: '1234円' → ok 1234", () => {
    expect(parseMoneyInput("1234円")).toEqual({ ok: true, value: 1234 });
  });

  it("全角数字: '１２３４' → ok 1234", () => {
    expect(parseMoneyInput("１２３４")).toEqual({ ok: true, value: 1234 });
  });

  it("全角カンマ: '１，２３４' → ok 1234", () => {
    expect(parseMoneyInput("１，２３４")).toEqual({ ok: true, value: 1234 });
  });

  it("前後の半角空白: ' 500 ' → ok 500", () => {
    expect(parseMoneyInput(" 500 ")).toEqual({ ok: true, value: 500 });
  });

  it("前後の全角空白: '　500　' → ok 500", () => {
    expect(parseMoneyInput("　500　")).toEqual({ ok: true, value: 500 });
  });

  it("先頭の余分なゼロ: '007' → ok 7", () => {
    expect(parseMoneyInput("007")).toEqual({ ok: true, value: 7 });
  });

  it("上限ちょうど（境界）: '1000000000' → ok", () => {
    expect(parseMoneyInput("1000000000")).toEqual({ ok: true, value: 1000000000 });
  });

  it("小数部は切り捨てる: '1234.56' → ok 1234", () => {
    expect(parseMoneyInput("1234.56")).toEqual({ ok: true, value: 1234 });
  });

  it("全角ピリオド: '1．5' → ok 1", () => {
    expect(parseMoneyInput("1．5")).toEqual({ ok: true, value: 1 });
  });

  it("小数切り捨ての結果 0: '0.9' → ok 0", () => {
    expect(parseMoneyInput("0.9")).toEqual({ ok: true, value: 0 });
  });

  it("空文字は empty", () => {
    expect(parseMoneyInput("")).toEqual({ ok: false, reason: "empty" });
  });

  it("空白のみは empty", () => {
    expect(parseMoneyInput("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("カンマのみは empty", () => {
    expect(parseMoneyInput(",")).toEqual({ ok: false, reason: "empty" });
  });

  it("カンマが複数でも empty: ',,'", () => {
    expect(parseMoneyInput(",,")).toEqual({ ok: false, reason: "empty" });
  });

  it("¥記号のみは empty", () => {
    expect(parseMoneyInput("¥")).toEqual({ ok: false, reason: "empty" });
  });

  it("「円」のみは empty", () => {
    expect(parseMoneyInput("円")).toEqual({ ok: false, reason: "empty" });
  });

  it("カンマ入り小数も切り捨てる: '1,234.00' → ok 1234", () => {
    expect(parseMoneyInput("1,234.00")).toEqual({ ok: true, value: 1234 });
  });

  it("数字を含まない文字列は format: 'abc'", () => {
    expect(parseMoneyInput("abc")).toEqual({ ok: false, reason: "format" });
  });

  it("数字と文字が混在: '12a' → format", () => {
    expect(parseMoneyInput("12a")).toEqual({ ok: false, reason: "format" });
  });

  it("指数表記もどきは format: '1e5'", () => {
    expect(parseMoneyInput("1e5")).toEqual({ ok: false, reason: "format" });
  });

  it("マイナスの連続は format: '--5'", () => {
    expect(parseMoneyInput("--5")).toEqual({ ok: false, reason: "format" });
  });

  it("'-' だけは既定（allowNegative なし）では format", () => {
    expect(parseMoneyInput("-")).toEqual({ ok: false, reason: "format" });
  });

  it("'-' だけは allowNegative では partial（負数を打ち始めた途中）", () => {
    expect(parseMoneyInput("-", { allowNegative: true })).toEqual({ ok: false, reason: "partial" });
  });

  it("'.' だけは format", () => {
    expect(parseMoneyInput(".")).toEqual({ ok: false, reason: "format" });
  });

  it("'-.5' は format（小数点切り捨て後に '-' だけが残る）", () => {
    expect(parseMoneyInput("-.5")).toEqual({ ok: false, reason: "format" });
  });

  it("allowNegative 既定（false）では負数は negative: '-500'", () => {
    expect(parseMoneyInput("-500")).toEqual({ ok: false, reason: "negative" });
  });

  it("allowNegative: true では負数を許す: '-500' → ok -500", () => {
    expect(parseMoneyInput("-500", { allowNegative: true })).toEqual({ ok: true, value: -500 });
  });

  it("全角マイナス（U+2212）も負数として扱う", () => {
    expect(parseMoneyInput("−500", { allowNegative: true })).toEqual({ ok: true, value: -500 });
  });

  it("長音記号も負数として扱う: 'ー500'", () => {
    expect(parseMoneyInput("ー500", { allowNegative: true })).toEqual({ ok: true, value: -500 });
  });

  it("'-0' は allowNegative でも 0 になり、-0 を作らない", () => {
    const result = parseMoneyInput("-0", { allowNegative: true });
    expect(result).toEqual({ ok: true, value: 0 });
    expect(result.ok && Object.is(result.value, -0)).toBe(false);
  });

  it("上限超過は tooLarge: '9999999999'", () => {
    expect(parseMoneyInput("9999999999")).toEqual({ ok: false, reason: "tooLarge" });
  });

  it("負数側の上限超過も tooLarge: '-9999999999'", () => {
    expect(parseMoneyInput("-9999999999", { allowNegative: true })).toEqual({ ok: false, reason: "tooLarge" });
  });

  it("maxValue を指定できる: maxValue=100 で '101' → tooLarge", () => {
    expect(parseMoneyInput("101", { maxValue: 100 })).toEqual({ ok: false, reason: "tooLarge" });
  });
});

describe("toMoneyInputText", () => {
  it("undefined は空文字", () => {
    expect(toMoneyInputText(undefined)).toBe("");
  });

  it("正数はカンマなしのそのままの数字", () => {
    expect(toMoneyInputText(1234)).toBe("1234");
  });

  it("負数はマイナス付き", () => {
    expect(toMoneyInputText(-2500)).toBe("-2500");
  });

  it("小数は四捨五入される", () => {
    expect(toMoneyInputText(1234.6)).toBe("1235");
  });

  it("非有限値（NaN・Infinity）は空文字", () => {
    expect(toMoneyInputText(Number.NaN)).toBe("");
    expect(toMoneyInputText(Infinity)).toBe("");
    expect(toMoneyInputText(-Infinity)).toBe("");
  });
});

describe("moneyInputErrorMessage", () => {
  it("format", () => {
    expect(moneyInputErrorMessage("format")).toBe("半角数字で入力してください");
  });

  it("negative", () => {
    expect(moneyInputErrorMessage("negative")).toBe("0以上の金額を入力してください");
  });

  it("tooLarge", () => {
    expect(moneyInputErrorMessage("tooLarge")).toBe("10億円以下で入力してください");
  });

  it("empty は undefined", () => {
    expect(moneyInputErrorMessage("empty")).toBeUndefined();
  });

  it("partial は undefined", () => {
    expect(moneyInputErrorMessage("partial")).toBeUndefined();
  });
});
