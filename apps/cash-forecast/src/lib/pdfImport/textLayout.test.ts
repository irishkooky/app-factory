import { describe, expect, it } from "vitest";
import { groupItemsIntoLines, type TextItem } from "./textLayout";

describe("groupItemsIntoLines", () => {
  it("空白のみ／空文字列のitemは捨てる", () => {
    const items: TextItem[] = [
      { str: "あ", x: 0, y: 100, width: 10 },
      { str: "   ", x: 20, y: 100, width: 10 },
      { str: "", x: 40, y: 100, width: 10 },
    ];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["あ"] }]);
  });

  it("yの差が2以内なら同じ行、超えると別の行になる", () => {
    const items: TextItem[] = [
      { str: "A", x: 0, y: 100, width: 10 },
      { str: "B", x: 20, y: 101.5, width: 10 }, // 同じ行(差1.5)
      { str: "C", x: 40, y: 90, width: 10 }, // 別の行(差10以上)
    ];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["A", "B"] }, { cells: ["C"] }]);
  });

  it("行はy降順(上から下)、行内はx昇順で並ぶ", () => {
    const items: TextItem[] = [
      { str: "下", x: 0, y: 50, width: 10 },
      { str: "上", x: 0, y: 200, width: 10 },
      { str: "中", x: 0, y: 125, width: 10 },
    ];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["上"] }, { cells: ["中"] }, { cells: ["下"] }]);
  });

  it("1つのitemの中に半角スペース区切りで入った文字は、セル内の空白として除去する", () => {
    // pdfjsは1セル分の文字列を1つのitemとして返すことが多いが、その中に
    // 半角スペース区切りで文字が入っていることがある（このPDF特有の癖）。
    const items: TextItem[] = [{ str: "1 2 , 3 4 5", x: 0, y: 100, width: 60 }];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["12,345"] }]);
  });

  it("同一セルがitemの区切りで分かれている場合、ギャップが4未満なら連結する", () => {
    const items: TextItem[] = [
      { str: "1 2 ,", x: 0, y: 100, width: 30 }, // rightEdge = 30
      { str: "3 4 5", x: 32, y: 100, width: 25 }, // gap = 2 (<4) → 連結
    ];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["12,345"] }]);
  });

  it("ギャップが4以上なら新しいセルになる（隣接セルは連結しない）", () => {
    const items: TextItem[] = [
      { str: "9 9", x: 0, y: 100, width: 20 }, // rightEdge = 20
      { str: "1 2 , 3 4 5", x: 30, y: 100, width: 60 }, // gap = 10 (>=4) → 別セル
    ];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["99", "12,345"] }]);
  });

  it("全角スペースも除去する", () => {
    const items: TextItem[] = [{ str: "お　客", x: 0, y: 100, width: 20 }];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["お客"] }]);
  });

  it("同じ座標に同じ文字列が重なって出る二重描画(太字)は1つに潰す", () => {
    const items: TextItem[] = [
      { str: "お支払", x: 92, y: 100, width: 30 },
      { str: "お支払", x: 92.2, y: 100, width: 30 }, // 差0.5以内の重複描画
      { str: "書", x: 125, y: 100, width: 10 }, // 生き残った1個目からのギャップ3(<4)で連結
    ];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["お支払書"] }]);
  });

  it("座標差が0.5を超える同一文字列は重複とみなさず、通常のitemとして連結対象になる", () => {
    const items: TextItem[] = [
      { str: "A", x: 0, y: 100, width: 10 },
      { str: "A", x: 2, y: 100, width: 10 }, // 差2 > 0.5 なので重複ではない。gap=-8(<4)で連結
    ];
    const lines = groupItemsIntoLines(items);
    expect(lines).toEqual([{ cells: ["AA"] }]);
  });
});
