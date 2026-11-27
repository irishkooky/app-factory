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

export interface SakeRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  rating: number;
  memo: string;
  label: SakeLabelInfo;
  imageMime: string;
  thumbMime: string;
  image: Blob;
  thumb: Blob;
}

export type RatingFilter = "all" | "4plus" | "3plus" | "5only";
