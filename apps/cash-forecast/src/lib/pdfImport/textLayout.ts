// pdfjs の getTextContent() が返す items[] を、目視で読める「行 × セル」の表に組み立てる純粋関数。
// 日本政策金融公庫のお支払額明細書PDFは、1セルの文字が半角スペース区切りの別item として
// 出てくる（例: "8 0 , 7 6 9"）ため、x座標のギャップでセルの境界を判定する。

export type TextItem = { str: string; x: number; y: number; width: number };
export type TextLine = { cells: string[] }; // 各セルは空白を全除去済み。x昇順

// 同じ行とみなすyの許容差(pt)
const Y_LINE_TOLERANCE = 2;
// 同一セル内で分割されたitem同士のxギャップの許容差(pt)。これ未満なら同一セルとして連結する
const CELL_MERGE_GAP = 4;
// 同一座標への二重描画（太字表現）とみなすxの許容差(pt)
const DUPLICATE_X_TOLERANCE = 0.5;

// 半角・全角スペースを全除去する
function stripWhitespace(s: string): string {
  return s.replace(/[\s　]/g, "");
}

export function groupItemsIntoLines(items: TextItem[]): TextLine[] {
  const filtered = items.filter((item) => item.str.trim() !== "");

  // yが近いitemを同じ行バケットにまとめる。
  // 代表y(バケット最初のitemのy)から2以内かどうかで判定する（probeスクリプトと同じ方式）。
  const buckets: { yRep: number; items: TextItem[] }[] = [];
  for (const item of filtered) {
    const bucket = buckets.find((b) => Math.abs(b.yRep - item.y) <= Y_LINE_TOLERANCE);
    if (bucket) {
      bucket.items.push(item);
    } else {
      buckets.push({ yRep: item.y, items: [item] });
    }
  }

  // yはPDF座標系で上ほど大きいため、降順=上から下の順になる
  buckets.sort((a, b) => b.yRep - a.yRep);

  return buckets.map((bucket) => {
    const sortedByX = [...bucket.items].sort((a, b) => a.x - b.x);

    // 太字などで同じ文字列が同座標に重なって出る二重描画を1つに潰す
    const deduped: TextItem[] = [];
    for (const item of sortedByX) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev.str === item.str && Math.abs(prev.x - item.x) <= DUPLICATE_X_TOLERANCE) {
        continue;
      }
      deduped.push(item);
    }

    // 直前itemの右端(x+width)からのギャップが4未満なら同じセルに連結する
    const cells: string[] = [];
    let currentCell = "";
    let prevRightEdge: number | null = null;
    for (const item of deduped) {
      if (prevRightEdge !== null && item.x - prevRightEdge < CELL_MERGE_GAP) {
        currentCell += item.str;
      } else {
        if (currentCell !== "") cells.push(stripWhitespace(currentCell));
        currentCell = item.str;
      }
      prevRightEdge = item.x + item.width;
    }
    if (currentCell !== "") cells.push(stripWhitespace(currentCell));

    return { cells };
  });
}
