import { matchesRatingFilter, matchesSearchQuery } from "./filters.ts";
import { EMPTY_LABEL, type RatingFilter, type SakeRecord } from "./types.ts";

export type CaptureSession<T> =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "review"; shot: T }
  | { phase: "saving"; shot: T; rating: number }
  | { phase: "failed"; shot: T | null; message: string };

export type CaptureEvent<T> =
  | { type: "pick" }
  | { type: "ready"; shot: T }
  | { type: "prepare-failed"; message: string }
  | { type: "rate"; rating: number }
  | { type: "saved" }
  | { type: "save-failed"; message: string }
  | { type: "dismiss" };

const PREPARE_ERROR = "画像を処理できませんでした";
const SAVE_ERROR = "保存できませんでした";

function textOr(message: string, fallback: string): string {
  return message.trim() ? message : fallback;
}

function canRate(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
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
      return { phase: "review", shot: event.shot };
    case "prepare-failed":
      if (session.phase !== "preparing") return session;
      return { phase: "failed", shot: null, message: textOr(event.message, PREPARE_ERROR) };
    case "rate": {
      if (!canRate(event.rating)) return session;
      if (session.phase === "review") {
        return { phase: "saving", shot: session.shot, rating: event.rating };
      }
      if (session.phase === "failed" && session.shot !== null) {
        return { phase: "saving", shot: session.shot, rating: event.rating };
      }
      return session;
    }
    case "saved":
      if (session.phase !== "saving") return session;
      return { phase: "idle" };
    case "save-failed":
      if (session.phase !== "saving") return session;
      return { phase: "failed", shot: session.shot, message: textOr(event.message, SAVE_ERROR) };
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

function freshRecord(rating: number): SakeRecord {
  return {
    id: "",
    createdAt: 0,
    updatedAt: 0,
    rating,
    memo: "",
    label: EMPTY_LABEL,
    analysisStatus: "pending",
    analysisError: "",
    imageMime: "image/jpeg",
    thumbMime: "image/jpeg",
    image: new Blob(),
    thumb: new Blob(),
  };
}

export function freshCaptureVisible(rating: number, filter: RatingFilter, query: string): boolean {
  const record = freshRecord(rating);
  return matchesRatingFilter(record.rating, filter) && matchesSearchQuery(record, query);
}
