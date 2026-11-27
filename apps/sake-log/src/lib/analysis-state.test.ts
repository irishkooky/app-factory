import assert from "node:assert/strict";
import { canRetryAnalysis, transitionAnalysis, type AnalysisFields } from "./analysis-state.ts";

const pending: AnalysisFields = { analysisStatus: "pending", analysisError: "" };

const done = transitionAnalysis(pending, { type: "succeed" });
assert.equal(done.analysisStatus, "done");
assert.equal(done.analysisError, "");

const missingKey = "GEMINI_API_KEY が未設定のため解析できません";
const failed = transitionAnalysis(pending, { type: "fail", message: missingKey });
assert.equal(failed.analysisStatus, "failed");
assert.equal(failed.analysisError, missingKey);
assert.equal(canRetryAnalysis(failed.analysisStatus), true);
assert.equal(canRetryAnalysis("pending"), false);

const retry = transitionAnalysis(failed, { type: "begin" });
assert.equal(retry.analysisStatus, "pending");
assert.equal(retry.analysisError, "");

const recovered = transitionAnalysis(retry, { type: "succeed" });
assert.equal(recovered.analysisStatus, "done");

const blank = transitionAnalysis(pending, { type: "fail", message: "  " });
assert.equal(blank.analysisError, "解析に失敗しました");
