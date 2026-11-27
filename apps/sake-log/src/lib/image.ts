import { FULL_MAX_EDGE, THUMB_MAX_EDGE, computeScaledSize, pickOutputMime } from "./image-scale.ts";

export interface PreparedSakeImages {
  image: Blob;
  thumb: Blob;
  imageMime: "image/webp" | "image/jpeg";
  thumbMime: "image/webp" | "image/jpeg";
  previewUrl: string;
}

const QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("画像の圧縮に失敗しました"));
        else resolve(blob);
      },
      mime,
      QUALITY,
    );
  });
}

async function renderScaled(img: HTMLImageElement, maxEdge: number, mime: string): Promise<Blob> {
  const { width, height } = computeScaledSize(img.naturalWidth, img.naturalHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を処理できませんでした");
  ctx.fillStyle = "#f8f4ef";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToBlob(canvas, mime);
}

/** 長辺 1024px 前後に圧縮し、グリッド用のサムネイルも作る */
export async function prepareSakeImages(file: File): Promise<PreparedSakeImages> {
  const img = await loadImage(file);
  const mime = pickOutputMime(
    typeof document !== "undefined" &&
      typeof document.createElement("canvas").toDataURL === "function"
      ? document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp")
      : false,
  );
  const [image, thumb] = await Promise.all([
    renderScaled(img, FULL_MAX_EDGE, mime),
    renderScaled(img, THUMB_MAX_EDGE, mime),
  ]);
  const previewUrl = URL.createObjectURL(image);
  return { image, thumb, imageMime: mime, thumbMime: mime, previewUrl };
}
