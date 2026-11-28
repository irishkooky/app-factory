import assert from "node:assert/strict";
import { buildNewRecord, validateStoredRecord } from "./db-record.ts";
import { registerSuite } from "./test-case.ts";

const blob = new Blob(["img"], { type: "image/jpeg" });

function stored(overrides: Record<string, unknown> = {}) {
  return {
    id: "old",
    createdAt: 1,
    updatedAt: 2,
    rating: 4,
    memo: "",
    label: {
      brandName: "",
      brewery: "",
      classification: "",
      region: "",
      tasteHints: "",
    },
    analysisStatus: "done",
    analysisError: "",
    imageMime: "image/jpeg",
    thumbMime: "image/jpeg",
    image: blob,
    thumb: blob,
    ...overrides,
  };
}

const legacy = validateStoredRecord(stored());
assert.ok(legacy);
assert.equal(legacy.rating, 4);
assert.equal(legacy.dryness, null);
assert.equal(legacy.memo, "");

const missingRating = stored();
delete missingRating.rating;
assert.equal(validateStoredRecord(missingRating)?.rating, null);

for (const rating of [0, 6, 1.5, Number.NaN]) {
  assert.equal(validateStoredRecord(stored({ rating }))?.rating, null);
}

for (const dryness of [0, 6, 1.5]) {
  assert.equal(validateStoredRecord(stored({ dryness }))?.dryness, null);
}

const empty = buildNewRecord({
  id: "empty",
  rating: null,
  dryness: null,
  memo: "",
  image: blob,
  thumb: blob,
  imageMime: "image/jpeg",
  thumbMime: "image/jpeg",
  now: 100,
});
const emptyRead = validateStoredRecord(empty);
assert.ok(emptyRead);
assert.equal(emptyRead.rating, null);
assert.equal(emptyRead.dryness, null);
assert.equal(emptyRead.memo, "");
assert.equal(emptyRead.createdAt, 100);
assert.equal(emptyRead.analysisStatus, "pending");

const spicy = buildNewRecord({
  id: "spicy",
  rating: 4,
  dryness: 5,
  memo: "  きれいな辛口  ",
  image: blob,
  thumb: blob,
  imageMime: "image/jpeg",
  thumbMime: "image/jpeg",
  now: 100,
});
assert.equal(spicy.memo, "きれいな辛口");
assert.equal(spicy.dryness, 5);
const spicyRead = validateStoredRecord(spicy);
assert.ok(spicyRead);
assert.equal(spicyRead.rating, 4);
assert.equal(spicyRead.dryness, 5);
assert.equal(spicyRead.memo, "きれいな辛口");

const cleared = buildNewRecord({
  id: "cleared",
  rating: 0,
  dryness: null,
  memo: " 芳醇 ",
  image: blob,
  thumb: blob,
  imageMime: "image/jpeg",
  thumbMime: "image/jpeg",
  now: 100,
});
assert.equal(cleared.rating, null);
assert.equal(cleared.memo, "芳醇");
assert.equal(validateStoredRecord(null), null);
assert.ok(validateStoredRecord(empty));

registerSuite("db record");
