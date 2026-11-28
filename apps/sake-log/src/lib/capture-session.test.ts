import assert from "node:assert/strict";
import {
  freshCaptureVisible,
  isSheetOpen,
  shotOf,
  stepCapture,
  type CaptureDraft,
  type CaptureSession,
} from "./capture-session.ts";
import { registerSuite } from "./test-case.ts";

const idle: CaptureSession<string> = { phase: "idle" };
const shot = "label";
const emptyDraft: CaptureDraft = { rating: null, dryness: null, memo: "" };

function preparing(): CaptureSession<string> {
  const next = stepCapture(idle, { type: "pick" });
  assert.deepEqual(next, { phase: "preparing" });
  return next;
}

function review(value = shot): CaptureSession<string> {
  const next = stepCapture(preparing(), { type: "ready", shot: value });
  assert.deepEqual(next, { phase: "review", shot: value, draft: emptyDraft });
  return next;
}

function saving(value = shot): CaptureSession<string> {
  const next = stepCapture(review(value), { type: "save" });
  assert.deepEqual(next, { phase: "saving", shot: value, draft: emptyDraft });
  return next;
}

const heldPreparing = preparing();
assert.equal(stepCapture(heldPreparing, { type: "pick" }), heldPreparing);

const openReview = review();
assert.equal(stepCapture(openReview, { type: "pick" }), openReview);
const openSaving = saving();
assert.equal(stepCapture(openSaving, { type: "pick" }), openSaving);
const openFailed = stepCapture(openSaving, { type: "save-failed", message: "full" });
assert.deepEqual(openFailed, { phase: "failed", shot, message: "full", draft: emptyDraft });
assert.equal(stepCapture(openFailed, { type: "pick" }), openFailed);
const prepareFailed = stepCapture(preparing(), { type: "prepare-failed", message: "壊れた画像" });
assert.deepEqual(prepareFailed, {
  phase: "failed",
  shot: null,
  message: "壊れた画像",
  draft: emptyDraft,
});
assert.equal(stepCapture(prepareFailed, { type: "pick" }), prepareFailed);

assert.equal(stepCapture(idle, { type: "ready", shot: "stale" }), idle);
assert.equal(stepCapture(openReview, { type: "ready", shot: "stale" }), openReview);
assert.equal(stepCapture(openSaving, { type: "ready", shot: "stale" }), openSaving);
assert.equal(stepCapture(prepareFailed, { type: "ready", shot: "stale" }), prepareFailed);
assert.equal(stepCapture(openFailed, { type: "ready", shot: "stale" }), openFailed);

const blankPrepare = stepCapture(preparing(), { type: "prepare-failed", message: "" });
assert.deepEqual(blankPrepare, {
  phase: "failed",
  shot: null,
  message: "画像を処理できませんでした",
  draft: emptyDraft,
});
const spacePrepare = stepCapture(preparing(), { type: "prepare-failed", message: "   " });
assert.deepEqual(spacePrepare, {
  phase: "failed",
  shot: null,
  message: "画像を処理できませんでした",
  draft: emptyDraft,
});
const wordedPrepare = stepCapture(preparing(), { type: "prepare-failed", message: " 読めない " });
assert.deepEqual(wordedPrepare, {
  phase: "failed",
  shot: null,
  message: " 読めない ",
  draft: emptyDraft,
});
assert.equal(stepCapture(idle, { type: "prepare-failed", message: "x" }), idle);
assert.equal(stepCapture(openReview, { type: "prepare-failed", message: "x" }), openReview);
assert.equal(stepCapture(openSaving, { type: "prepare-failed", message: "x" }), openSaving);

const rated = stepCapture(openReview, { type: "set-rating", rating: 4 });
assert.equal(rated.phase, "review");
if (rated.phase === "review") assert.equal(rated.draft.rating, 4);
assert.notEqual(rated.phase, "saving");

const keptRating = stepCapture(rated, { type: "save" });
assert.equal(keptRating.phase, "saving");
if (keptRating.phase === "saving") assert.equal(keptRating.draft.rating, 4);

assert.equal(stepCapture(openReview, { type: "set-rating", rating: 0 }), openReview);
assert.equal(stepCapture(openReview, { type: "set-rating", rating: 1.5 }), openReview);
assert.equal(stepCapture(openReview, { type: "set-rating", rating: 6 }), openReview);
assert.equal(stepCapture(openReview, { type: "set-rating", rating: Number.NaN }), openReview);
assert.equal(stepCapture(idle, { type: "set-rating", rating: 5 }), idle);
assert.equal(stepCapture(heldPreparing, { type: "set-rating", rating: 5 }), heldPreparing);
assert.equal(stepCapture(prepareFailed, { type: "set-rating", rating: 3 }), prepareFailed);
assert.equal(stepCapture(openSaving, { type: "set-rating", rating: 1 }), openSaving);

const dried = stepCapture(openReview, { type: "set-dryness", dryness: 3 });
assert.equal(dried.phase, "review");
if (dried.phase === "review") {
  assert.equal(dried.draft.dryness, 3);
  const cleared = stepCapture(dried, { type: "set-dryness", dryness: 3 });
  assert.equal(cleared.phase, "review");
  if (cleared.phase === "review") assert.equal(cleared.draft.dryness, null);
  const moved = stepCapture(dried, { type: "set-dryness", dryness: 5 });
  if (moved.phase === "review") assert.equal(moved.draft.dryness, 5);
}

const noted = stepCapture(review("kept"), { type: "set-memo", memo: "また飲む" });
const notedDry = stepCapture(noted, { type: "set-dryness", dryness: 5 });
const notedSaving = stepCapture(notedDry, { type: "save" });
assert.equal(notedSaving.phase, "saving");
const notedFailed = stepCapture(notedSaving, { type: "save-failed", message: "disk" });
assert.equal(notedFailed.phase, "failed");
if (notedFailed.phase === "failed") {
  assert.equal(notedFailed.shot, "kept");
  assert.equal(notedFailed.draft.memo, "また飲む");
  assert.equal(notedFailed.draft.dryness, 5);
  const retried = stepCapture(notedFailed, { type: "save" });
  assert.equal(retried.phase, "saving");
  if (retried.phase === "saving") assert.equal(retried.draft.memo, "また飲む");
}

const sameShot = { url: "blob:1" };
const objectReview = stepCapture(stepCapture(idle, { type: "pick" }), {
  type: "ready",
  shot: sameShot,
});
const objectSaving = stepCapture(objectReview, { type: "save" });
assert.equal(objectSaving.phase, "saving");
if (objectSaving.phase === "saving") assert.equal(objectSaving.shot, sameShot);

assert.deepEqual(stepCapture(openSaving, { type: "saved" }), { phase: "idle" });
assert.equal(stepCapture(idle, { type: "saved" }), idle);
assert.equal(stepCapture(openReview, { type: "saved" }), openReview);
assert.equal(stepCapture(heldPreparing, { type: "saved" }), heldPreparing);
assert.equal(stepCapture(openFailed, { type: "saved" }), openFailed);

const kept = stepCapture(saving("photo"), { type: "save-failed", message: "容量不足" });
assert.deepEqual(kept, {
  phase: "failed",
  shot: "photo",
  message: "容量不足",
  draft: emptyDraft,
});
const blankSave = stepCapture(saving("photo"), { type: "save-failed", message: "" });
assert.deepEqual(blankSave, {
  phase: "failed",
  shot: "photo",
  message: "保存できませんでした",
  draft: emptyDraft,
});
const spaceSave = stepCapture(saving("photo"), { type: "save-failed", message: "  " });
assert.deepEqual(spaceSave, {
  phase: "failed",
  shot: "photo",
  message: "保存できませんでした",
  draft: emptyDraft,
});
const paddedSave = stepCapture(saving("photo"), { type: "save-failed", message: " 容量不足 " });
assert.deepEqual(paddedSave, {
  phase: "failed",
  shot: "photo",
  message: " 容量不足 ",
  draft: emptyDraft,
});
assert.equal(stepCapture(openReview, { type: "save-failed", message: "x" }), openReview);
assert.equal(stepCapture(idle, { type: "save-failed", message: "" }), idle);
assert.equal(stepCapture(heldPreparing, { type: "save-failed", message: "" }), heldPreparing);

const edited = stepCapture(openReview, { type: "set-memo", memo: "残さない" });
assert.deepEqual(stepCapture(edited, { type: "dismiss" }), { phase: "idle" });
assert.deepEqual(stepCapture(heldPreparing, { type: "dismiss" }), { phase: "idle" });
assert.deepEqual(stepCapture(openFailed, { type: "dismiss" }), { phase: "idle" });
assert.deepEqual(stepCapture(prepareFailed, { type: "dismiss" }), { phase: "idle" });
assert.equal(stepCapture(openSaving, { type: "dismiss" }), openSaving);
assert.equal(stepCapture(idle, { type: "dismiss" }), idle);

assert.equal(isSheetOpen(idle), false);
assert.equal(isSheetOpen(heldPreparing), false);
assert.equal(isSheetOpen(openReview), true);
assert.equal(isSheetOpen(openSaving), true);
assert.equal(isSheetOpen(prepareFailed), false);
assert.equal(isSheetOpen(openFailed), true);
assert.equal(isSheetOpen(kept), true);

assert.equal(shotOf(idle), null);
assert.equal(shotOf(heldPreparing), null);
assert.equal(shotOf(openReview), shot);
assert.equal(shotOf(openSaving), shot);
assert.equal(shotOf(prepareFailed), null);
assert.equal(shotOf(kept), "photo");
assert.equal(shotOf(objectSaving), sameShot);

function draft(rating: number | null, memo = ""): CaptureDraft {
  return { rating, dryness: null, memo };
}

assert.equal(freshCaptureVisible(draft(null), "all", ""), true);
assert.equal(freshCaptureVisible(draft(null), "4plus", ""), false);
assert.equal(freshCaptureVisible(draft(null), "3plus", ""), false);
assert.equal(freshCaptureVisible(draft(null), "5only", ""), false);
assert.equal(freshCaptureVisible(draft(null, "芳醇"), "all", "芳"), true);
assert.equal(freshCaptureVisible(draft(null, "芳醇"), "4plus", "芳"), false);
assert.equal(freshCaptureVisible(draft(5), "all", ""), true);
assert.equal(freshCaptureVisible(draft(5), "4plus", ""), true);
assert.equal(freshCaptureVisible(draft(4), "4plus", ""), true);
assert.equal(freshCaptureVisible(draft(3), "4plus", ""), false);
assert.equal(freshCaptureVisible(draft(3), "3plus", ""), true);
assert.equal(freshCaptureVisible(draft(2), "3plus", ""), false);
assert.equal(freshCaptureVisible(draft(5), "5only", ""), true);
assert.equal(freshCaptureVisible(draft(4), "5only", ""), false);
assert.equal(freshCaptureVisible(draft(1), "all", ""), true);
assert.equal(freshCaptureVisible(draft(5), "all", "獺祭"), false);
assert.equal(freshCaptureVisible(draft(5), "4plus", "酒"), false);
assert.equal(freshCaptureVisible(draft(5), "all", "   "), true);

registerSuite("capture session");
