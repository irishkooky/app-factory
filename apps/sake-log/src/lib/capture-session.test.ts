import assert from "node:assert/strict";
import {
  freshCaptureVisible,
  isSheetOpen,
  shotOf,
  stepCapture,
  type CaptureSession,
} from "./capture-session.ts";
import { registerSuite } from "./test-case.ts";

const idle: CaptureSession<string> = { phase: "idle" };
const shot = "label";

function preparing(): CaptureSession<string> {
  const next = stepCapture(idle, { type: "pick" });
  assert.deepEqual(next, { phase: "preparing" });
  return next;
}

function review(value = shot): CaptureSession<string> {
  const next = stepCapture(preparing(), { type: "ready", shot: value });
  assert.deepEqual(next, { phase: "review", shot: value });
  return next;
}

function saving(rating = 4, value = shot): CaptureSession<string> {
  const next = stepCapture(review(value), { type: "rate", rating });
  assert.deepEqual(next, { phase: "saving", shot: value, rating });
  return next;
}

const heldPreparing = preparing();
assert.equal(stepCapture(heldPreparing, { type: "pick" }), heldPreparing);

const openReview = review();
assert.equal(stepCapture(openReview, { type: "pick" }), openReview);
const openSaving = saving();
assert.equal(stepCapture(openSaving, { type: "pick" }), openSaving);
const openFailed = stepCapture(openSaving, { type: "save-failed", message: "full" });
assert.deepEqual(openFailed, { phase: "failed", shot, message: "full" });
assert.equal(stepCapture(openFailed, { type: "pick" }), openFailed);
const prepareFailed = stepCapture(preparing(), { type: "prepare-failed", message: "壊れた画像" });
assert.deepEqual(prepareFailed, { phase: "failed", shot: null, message: "壊れた画像" });
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
});
const spacePrepare = stepCapture(preparing(), { type: "prepare-failed", message: "   " });
assert.deepEqual(spacePrepare, {
  phase: "failed",
  shot: null,
  message: "画像を処理できませんでした",
});
const wordedPrepare = stepCapture(preparing(), { type: "prepare-failed", message: " 読めない " });
assert.deepEqual(wordedPrepare, { phase: "failed", shot: null, message: " 読めない " });
assert.equal(stepCapture(idle, { type: "prepare-failed", message: "x" }), idle);
assert.equal(stepCapture(openReview, { type: "prepare-failed", message: "x" }), openReview);
assert.equal(stepCapture(openSaving, { type: "prepare-failed", message: "x" }), openSaving);

for (const rating of [1, 2, 3, 4, 5]) {
  const next = stepCapture(review("same"), { type: "rate", rating });
  assert.deepEqual(next, { phase: "saving", shot: "same", rating });
}

const sameShot = { url: "blob:1" };
const objectReview = stepCapture(stepCapture(idle, { type: "pick" }), {
  type: "ready",
  shot: sameShot,
});
const objectSaving = stepCapture(objectReview, { type: "rate", rating: 2 });
assert.equal(objectSaving.phase, "saving");
if (objectSaving.phase === "saving") assert.equal(objectSaving.shot, sameShot);

assert.equal(stepCapture(openReview, { type: "rate", rating: 0 }), openReview);
assert.equal(stepCapture(openReview, { type: "rate", rating: 1.5 }), openReview);
assert.equal(stepCapture(openReview, { type: "rate", rating: 4.2 }), openReview);
assert.equal(stepCapture(openReview, { type: "rate", rating: 6 }), openReview);
assert.equal(stepCapture(openReview, { type: "rate", rating: -1 }), openReview);
assert.equal(stepCapture(openReview, { type: "rate", rating: Number.NaN }), openReview);
assert.equal(stepCapture(idle, { type: "rate", rating: 5 }), idle);
const preparingRated = stepCapture(heldPreparing, { type: "rate", rating: 5 });
assert.equal(preparingRated, heldPreparing);
assert.equal(stepCapture(prepareFailed, { type: "rate", rating: 3 }), prepareFailed);

const failedWithShot = stepCapture(saving(4, "kept"), { type: "save-failed", message: "disk" });
const retried = stepCapture(failedWithShot, { type: "rate", rating: 1 });
assert.deepEqual(retried, { phase: "saving", shot: "kept", rating: 1 });

const doubleRate = stepCapture(openSaving, { type: "rate", rating: 5 });
assert.equal(doubleRate, openSaving);
if (openSaving.phase === "saving") assert.equal(openSaving.rating, 4);

assert.deepEqual(stepCapture(openSaving, { type: "saved" }), { phase: "idle" });
assert.equal(stepCapture(idle, { type: "saved" }), idle);
assert.equal(stepCapture(openReview, { type: "saved" }), openReview);
assert.equal(stepCapture(heldPreparing, { type: "saved" }), heldPreparing);
assert.equal(stepCapture(openFailed, { type: "saved" }), openFailed);

const kept = stepCapture(saving(3, "photo"), { type: "save-failed", message: "容量不足" });
assert.deepEqual(kept, { phase: "failed", shot: "photo", message: "容量不足" });
const blankSave = stepCapture(saving(3, "photo"), { type: "save-failed", message: "" });
assert.deepEqual(blankSave, { phase: "failed", shot: "photo", message: "保存できませんでした" });
const spaceSave = stepCapture(saving(3, "photo"), { type: "save-failed", message: "  " });
assert.deepEqual(spaceSave, { phase: "failed", shot: "photo", message: "保存できませんでした" });
const paddedSave = stepCapture(saving(3, "photo"), { type: "save-failed", message: " 容量不足 " });
assert.deepEqual(paddedSave, { phase: "failed", shot: "photo", message: " 容量不足 " });
assert.equal(stepCapture(openReview, { type: "save-failed", message: "x" }), openReview);
assert.equal(stepCapture(idle, { type: "save-failed", message: "" }), idle);
assert.equal(stepCapture(heldPreparing, { type: "save-failed", message: "" }), heldPreparing);

assert.deepEqual(stepCapture(openReview, { type: "dismiss" }), { phase: "idle" });
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

assert.equal(freshCaptureVisible(5, "all", ""), true);
assert.equal(freshCaptureVisible(5, "4plus", ""), true);
assert.equal(freshCaptureVisible(4, "4plus", ""), true);
assert.equal(freshCaptureVisible(3, "4plus", ""), false);
assert.equal(freshCaptureVisible(3, "3plus", ""), true);
assert.equal(freshCaptureVisible(2, "3plus", ""), false);
assert.equal(freshCaptureVisible(5, "5only", ""), true);
assert.equal(freshCaptureVisible(4, "5only", ""), false);
assert.equal(freshCaptureVisible(1, "all", ""), true);
assert.equal(freshCaptureVisible(5, "all", "獺祭"), false);
assert.equal(freshCaptureVisible(5, "4plus", "酒"), false);
assert.equal(freshCaptureVisible(5, "all", "   "), true);

registerSuite("capture session");
