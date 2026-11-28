import { matchesRatingFilter, matchesSearchQuery } from "./filters.ts";
import { EMPTY_LABEL, type Dryness, type RatingFilter, type SakeRecord } from "./types.ts";

export type CaptureDraft = {
  rating: number | null;
  dryness: Dryness | null;
  memo: string;
};

export const EMPTY_DRAFT: CaptureDraft = { rating: null, dryness: null, memo: "" };

export type CaptureSession<T> =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "review"; shot: T; draft: CaptureDraft }
  | { phase: "saving"; shot: T; draft: CaptureDraft }
  | { phase: "failed"; shot: T | null; message: string; draft: CaptureDraft };

export type CaptureEvent<T> =
  | { type: "pick" }
  | { type: "ready"; shot: T }
  | { type: "prepare-failed"; message: string }
  | { type: "set-rating"; rating: number | null }
  | { type: "set-dryness"; dryness: Dryness }
  | { type: "set-memo"; memo: string }
  | { type: "save" }
  | { type: "saved" }
  | { type: "save-failed"; message: string }
  | { type: "dismiss" };

const PREPARE_ERROR = "画像を処理できませんでした";
const SAVE_ERROR = "保存できませんでした";

function textOr(message: string, fallback: string): string {
  return message.trim() ? message : fallback;
}

function freshDraft(): CaptureDraft {
  return { ...EMPTY_DRAFT };
}

function isDryness(value: number): value is Dryness {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function draftRating(value: number | null): number | null | undefined {
  if (value === null) return null;
  if (Number.isInteger(value) && value >= 1 && value <= 5) return value;
  return undefined;
}

function withDraft<T>(
  session: CaptureSession<T>,
  update: (draft: CaptureDraft) => CaptureDraft,
): CaptureSession<T> {
  if (session.phase === "review") {
    return { phase: "review", shot: session.shot, draft: update(session.draft) };
  }
  if (session.phase === "failed" && session.shot !== null) {
    return {
      phase: "failed",
      shot: session.shot,
      message: session.message,
      draft: update(session.draft),
    };
  }
  return session;
}

export function stepCapture<T>(
  session: CaptureSession<T>,
  event: CaptureEvent<T>,
): CaptureSession<T> {
  switch (event.type) {
    case "pick":
      if (session.phase !== "idle") return session;
      return { phase: "preparing" };
    case "ready":
      if (session.phase !== "preparing") return session;
      return { phase: "review", shot: event.shot, draft: freshDraft() };
    case "prepare-failed":
      if (session.phase !== "preparing") return session;
      return {
        phase: "failed",
        shot: null,
        message: textOr(event.message, PREPARE_ERROR),
        draft: freshDraft(),
      };
    case "set-rating": {
      const rating = draftRating(event.rating);
      if (rating === undefined) return session;
      return withDraft(session, (draft) => ({ ...draft, rating }));
    }
    case "set-dryness": {
      if (!isDryness(event.dryness)) return session;
      return withDraft(session, (draft) => ({
        ...draft,
        dryness: draft.dryness === event.dryness ? null : event.dryness,
      }));
    }
    case "set-memo":
      return withDraft(session, (draft) => ({ ...draft, memo: event.memo }));
    case "save":
      if (session.phase === "review") {
        return { phase: "saving", shot: session.shot, draft: session.draft };
      }
      if (session.phase === "failed" && session.shot !== null) {
        return { phase: "saving", shot: session.shot, draft: session.draft };
      }
      return session;
    case "saved":
      if (session.phase !== "saving") return session;
      return { phase: "idle" };
    case "save-failed":
      if (session.phase !== "saving") return session;
      return {
        phase: "failed",
        shot: session.shot,
        message: textOr(event.message, SAVE_ERROR),
        draft: session.draft,
      };
    case "dismiss":
      if (
        session.phase === "review" ||
        session.phase === "preparing" ||
        session.phase === "failed"
      ) {
        return { phase: "idle" };
      }
      return session;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}

export function isSheetOpen<T>(session: CaptureSession<T>): boolean {
  switch (session.phase) {
    case "review":
    case "saving":
      return true;
    case "failed":
      return session.shot !== null;
    default:
      return false;
  }
}

export function shotOf<T>(session: CaptureSession<T>): T | null {
  switch (session.phase) {
    case "review":
    case "saving":
    case "failed":
      return session.shot;
    default:
      return null;
  }
}

function freshRecord(draft: CaptureDraft): SakeRecord {
  return {
    id: "",
    createdAt: 0,
    updatedAt: 0,
    rating: draft.rating,
    dryness: draft.dryness,
    memo: draft.memo,
    label: EMPTY_LABEL,
    analysisStatus: "pending",
    analysisError: "",
    imageMime: "image/jpeg",
    thumbMime: "image/jpeg",
    image: new Blob(),
    thumb: new Blob(),
  };
}

export function freshCaptureVisible(
  draft: CaptureDraft,
  filter: RatingFilter,
  query: string,
): boolean {
  const record = freshRecord(draft);
  return matchesRatingFilter(record.rating, filter) && matchesSearchQuery(record, query);
}
