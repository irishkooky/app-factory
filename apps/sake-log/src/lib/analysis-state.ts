import type { AnalysisStatus } from "./types.ts";

export interface AnalysisFields {
  analysisStatus: AnalysisStatus;
  analysisError: string;
}

export type AnalysisEvent =
  | { type: "begin" }
  | { type: "succeed" }
  | { type: "fail"; message: string };

const FALLBACK_ERROR = "解析に失敗しました";

export function analysisBegin(): AnalysisFields {
  return { analysisStatus: "pending", analysisError: "" };
}

export function analysisSucceed(): AnalysisFields {
  return { analysisStatus: "done", analysisError: "" };
}

export function analysisFail(message: string): AnalysisFields {
  const trimmed = message.trim();
  return { analysisStatus: "failed", analysisError: trimmed || FALLBACK_ERROR };
}

/** 解析ジョブの状態遷移。再試行は failed（または done）から begin で pending に戻す */
export function transitionAnalysis(_current: AnalysisFields, event: AnalysisEvent): AnalysisFields {
  switch (event.type) {
    case "begin":
      return analysisBegin();
    case "succeed":
      return analysisSucceed();
    case "fail":
      return analysisFail(event.message);
  }
}

export function canRetryAnalysis(status: AnalysisStatus): boolean {
  return status === "failed";
}
