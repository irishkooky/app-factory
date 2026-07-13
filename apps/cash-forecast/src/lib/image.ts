// ブラウザ専用の画像圧縮ユーティリティ。DOM APIに触れるのはこの関数の中だけに閉じ込め、
// SSR時にモジュール評価だけで壊れないようにする（トップレベルで document/window 等に触れない）。

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/** 画像ファイルを長辺1600px・JPEG品質0.8に圧縮する。元がそれより小さければリサイズせず再エンコードのみ行う。 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("画像の処理に失敗しました");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) {
      throw new Error("画像の変換に失敗しました");
    }
    return blob;
  } finally {
    bitmap.close();
  }
}
