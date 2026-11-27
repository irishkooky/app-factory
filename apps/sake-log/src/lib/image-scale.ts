export const FULL_MAX_EDGE = 1024;
export const THUMB_MAX_EDGE = 320;

export function computeScaledSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number; scale: number } {
  if (width <= 0 || height <= 0 || maxEdge <= 0) {
    return { width: 0, height: 0, scale: 0 };
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

export function pickOutputMime(supportsWebp: boolean): "image/webp" | "image/jpeg" {
  return supportsWebp ? "image/webp" : "image/jpeg";
}
