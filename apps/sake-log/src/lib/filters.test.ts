import assert from "node:assert/strict";
import { registerSuite } from "./test-case.ts";
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
    dryness: null,
    memo: "すっきり",
    label: { ...EMPTY_LABEL, brandName: "獺祭" },
    analysisStatus: "done",
    analysisError: "",
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

const unrated = sample({ id: "u", rating: null, memo: "余韻" });
assert.equal(matchesRatingFilter(null, "all"), true);
assert.equal(matchesRatingFilter(null, "4plus"), false);
assert.equal(matchesRatingFilter(null, "3plus"), false);
assert.equal(matchesRatingFilter(null, "5only"), false);

const mixed = [unrated, sample({ id: "r", rating: 5, memo: "" })];
assert.deepEqual(
  filterSakeRecords(mixed, { filter: "all", query: "" }).map((row) => row.id),
  ["u", "r"],
);
assert.deepEqual(
  filterSakeRecords(mixed, { filter: "4plus", query: "" }).map((row) => row.id),
  ["r"],
);
assert.deepEqual(
  filterSakeRecords(mixed, { filter: "3plus", query: "" }).map((row) => row.id),
  ["r"],
);
assert.deepEqual(
  filterSakeRecords(mixed, { filter: "5only", query: "" }).map((row) => row.id),
  ["r"],
);
assert.equal(filterSakeRecords([unrated], { filter: "all", query: "余韻" }).length, 1);

registerSuite("filters");
