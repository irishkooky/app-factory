import assert from "node:assert/strict";
import { computeScaledSize, pickOutputMime, FULL_MAX_EDGE } from "./image-scale.ts";

const full = computeScaledSize(2048, 1536, FULL_MAX_EDGE);
assert.equal(full.width, 1024);
assert.equal(full.height, 768);
assert.ok(full.scale < 1);

const small = computeScaledSize(400, 300, FULL_MAX_EDGE);
assert.equal(small.width, 400);
assert.equal(small.height, 300);
assert.equal(small.scale, 1);

assert.equal(pickOutputMime(true), "image/webp");
assert.equal(pickOutputMime(false), "image/jpeg");
