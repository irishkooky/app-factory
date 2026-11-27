import assert from "node:assert/strict";
import { filterSakeRecords, matchesRatingFilter } from "./filters.ts";
import type { SakeRecord } from "./types.ts";
import { EMPTY_LABEL } from "./types.ts";

const blob = new Blob(["x"], { type: "image/jpeg" });

function sample(overrides: Partial<SakeRecord>): SakeRecord {
  return {
    id: "1",
    createdAt: 1,
    updatedAt: 1,
    rating: 4,
    memo: "すっきり",
    label: { ...EMPTY_LABEL, brandName: "獺祭" },
    imageMime: "image/jpeg",
    thumbMime: "image/jpeg",
    image: blob,
    thumb: blob,
    ...overrides,
  };
}

assert.equal(matchesRatingFilter(5, "4plus"), true);
assert.equal(matchesRatingFilter(3, "4plus"), false);
assert.equal(matchesRatingFilter(5, "5only"), true);

const rows = [
  sample({ id: "a", rating: 5, label: { ...EMPTY_LABEL, brandName: "獺祭" }, memo: "" }),
  sample({ id: "b", rating: 2, label: { ...EMPTY_LABEL, brandName: "八海山" }, memo: "辛口" }),
];

const filtered = filterSakeRecords(rows, { filter: "4plus", query: "獺" });
assert.equal(filtered.length, 1);
assert.equal(filtered[0]?.id, "a");
