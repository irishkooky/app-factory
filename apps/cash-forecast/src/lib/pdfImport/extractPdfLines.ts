// PDFファイルからテキスト行を抽出する。ブラウザ専用（pdfjs-distはクライアントでのみ読み込む）。
// SSR/Workers環境でモジュールが評価されてもpdfjsが読み込まれないよう、
// importはすべて関数内のdynamic importにする。

import { groupItemsIntoLines, type TextItem, type TextLine } from "./textLayout";

export async function extractPdfLines(file: File): Promise<TextLine[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;

  try {
    const lines: TextLine[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      // getTextContent() の items は TextItem | TextMarkedContent の union。
      // TextMarkedContent は str を持たないため、{ str: string } に絞り込めば TextItem 側だけが残る
      // （pdfjs-dist はトップレベルから TextItem 型をexportしていないため、item自身の型から抽出する）。
      type ContentItem = (typeof textContent.items)[number];
      const items: TextItem[] = textContent.items
        .filter((item): item is Extract<ContentItem, { str: string }> => "str" in item)
        .map((item) => ({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
        }));
      lines.push(...groupItemsIntoLines(items));
    }

    return lines;
  } finally {
    // ページ描画に使ったリソース(メモリ・Worker側の状態)を確実に解放する。
    // destroy() は解決済みの PDFDocumentProxy ではなく、getDocument() が返す
    // loading task 側に生えている。
    await loadingTask.destroy();
  }
}
