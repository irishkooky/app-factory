import type { SakeLabelInfo } from "../lib/types.ts";
import { normalizeLabel } from "../lib/db-record.ts";

export interface LabelAnalysisResult extends SakeLabelInfo {}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Gemini の JSON 応答を正規化する（テスト対象） */
export function parseLabelAnalysis(raw: unknown): LabelAnalysisResult {
  const base = normalizeLabel(raw);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const taste =
    str(r.tasteHints) ||
    str(r.taste_hints) ||
    str(r.tasteNotes) ||
    (Array.isArray(r.tasteHints)
      ? r.tasteHints
          .map((x) => str(x))
          .filter(Boolean)
          .join("、")
      : "");
  return {
    brandName: str(r.brandName) || str(r.brand_name) || base.brandName,
    brewery: str(r.brewery) || str(r.brewery_name) || base.brewery,
    classification: str(r.classification) || str(r.sake_type) || base.classification,
    region: str(r.region) || str(r.origin) || base.region,
    tasteHints: taste || base.tasteHints,
  };
}

/** API 失敗時や空応答のフォールバック */
export function fallbackLabelAnalysis(reason?: string): LabelAnalysisResult {
  return {
    brandName: "",
    brewery: "",
    classification: "",
    region: "",
    tasteHints: reason?.trim() ? `（解析失敗: ${reason.trim()}）` : "",
  };
}
