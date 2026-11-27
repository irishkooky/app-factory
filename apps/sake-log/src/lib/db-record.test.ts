import assert from "node:assert/strict";
import { buildNewRecord, clampRating, validateStoredRecord } from "./db-record.ts";

assert.equal(clampRating(0), 1);
assert.equal(clampRating(6), 5);
assert.equal(clampRating(3.6), 4);

const blob = new Blob(["img"], { type: "image/jpeg" });
const record = buildNewRecord({
  id: "r1",
  rating: 4,
  memo: " 芳醇 ",
  image: blob,
  thumb: blob,
  imageMime: "image/jpeg",
  thumbMime: "image/jpeg",
  now: 100,
});
assert.equal(record.memo, "芳醇");
assert.equal(record.createdAt, 100);
assert.equal(record.analysisStatus, "pending");

assert.equal(validateStoredRecord(null), null);
assert.ok(validateStoredRecord(record));
