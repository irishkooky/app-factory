import { analysisBegin } from "./analysis-state.ts";
import {
  EMPTY_LABEL,
  type AnalysisStatus,
  type Dryness,
  type SakeLabelInfo,
  type SakeRecord,
} from "./types.ts";

function readRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 5) return null;
  return value;
}

function readDryness(value: unknown): Dryness | null {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) return value;
  return null;
}

export function normalizeLabel(input: unknown): SakeLabelInfo {
  const r = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const str = (key: string) => (typeof r[key] === "string" ? (r[key] as string).trim() : "");
  return {
    brandName: str("brandName"),
    brewery: str("brewery"),
    classification: str("classification"),
    region: str("region"),
    tasteHints: str("tasteHints"),
  };
}

export function validateStoredRecord(raw: unknown): SakeRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return null;
  if (typeof r.createdAt !== "number" || typeof r.updatedAt !== "number") return null;
  if (!(r.image instanceof Blob) || !(r.thumb instanceof Blob)) return null;
  if (typeof r.imageMime !== "string" || typeof r.thumbMime !== "string") return null;
  const memo = typeof r.memo === "string" ? r.memo.trim() : "";
  const label = normalizeLabel(r.label ?? EMPTY_LABEL);
  return {
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    rating: readRating(r.rating),
    dryness: readDryness(r.dryness),
    memo,
    label,
    analysisStatus: readAnalysisStatus(r.analysisStatus),
    analysisError: typeof r.analysisError === "string" ? r.analysisError : "",
    imageMime: r.imageMime,
    thumbMime: r.thumbMime,
    image: r.image,
    thumb: r.thumb,
  };
}

function readAnalysisStatus(value: unknown): AnalysisStatus {
  if (value === "pending" || value === "done" || value === "failed") return value;
  return "done";
}

export function buildNewRecord(input: {
  id: string;
  rating: number | null;
  dryness: Dryness | null;
  memo: string;
  label?: SakeLabelInfo;
  image: Blob;
  thumb: Blob;
  imageMime: string;
  thumbMime: string;
  now?: number;
}): SakeRecord {
  const now = input.now ?? Date.now();
  return {
    id: input.id,
    createdAt: now,
    updatedAt: now,
    rating: readRating(input.rating),
    dryness: readDryness(input.dryness),
    memo: input.memo.trim(),
    label: input.label ?? { ...EMPTY_LABEL },
    ...analysisBegin(),
    imageMime: input.imageMime,
    thumbMime: input.thumbMime,
    image: input.image,
    thumb: input.thumb,
  };
}
