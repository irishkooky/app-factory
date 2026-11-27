import assert from "node:assert/strict";
import { fallbackLabelAnalysis, parseLabelAnalysis } from "./parse-label.ts";
import { registerSuite } from "../lib/test-case.ts";

const parsed = parseLabelAnalysis({
  brandName: " 獺祭 ",
  brewery: "旭酒造",
  classification: "純米大吟醸",
  region: "山口",
  tasteHints: ["フルーティ", "軽快"],
});
assert.equal(parsed.brandName, "獺祭");
assert.equal(parsed.tasteHints, "フルーティ、軽快");

assert.equal(parseLabelAnalysis({ brand_name: "八海山" }).brandName, "八海山");

const fb = fallbackLabelAnalysis("timeout");
assert.ok(fb.tasteHints.includes("timeout"));

registerSuite("parse label");
