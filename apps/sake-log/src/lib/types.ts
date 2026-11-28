export interface SakeLabelInfo {
  brandName: string;
  brewery: string;
  classification: string;
  region: string;
  tasteHints: string;
}

export const EMPTY_LABEL: SakeLabelInfo = {
  brandName: "",
  brewery: "",
  classification: "",
  region: "",
  tasteHints: "",
};

export type AnalysisStatus = "pending" | "done" | "failed";

export type Dryness = 1 | 2 | 3 | 4 | 5;

export interface SakeRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  rating: number | null;
  dryness: Dryness | null;
  memo: string;
  label: SakeLabelInfo;
  analysisStatus: AnalysisStatus;
  analysisError: string;
  imageMime: string;
  thumbMime: string;
  image: Blob;
  thumb: Blob;
}

export type RatingFilter = "all" | "4plus" | "3plus" | "5only";
