import assert from 'node:assert/strict'
import { scenarioById } from '../data/scenarios.ts'
import { normalizeEvaluation } from './jev.ts'

const scenario = scenarioById('support')
assert.ok(scenario)
const valid = normalizeEvaluation({ model: 'jev', answers: { department: { choice: 'billing', confidence: 0.8 }, urgency: { score: 2.5 }, immediate: { noul: 0.75 } } }, scenario)
assert.equal(valid?.answers.department.choice, 'billing')
assert.equal(valid?.answers.urgency.score, 2.5)
assert.equal(valid?.answers.immediate.noul, 0.75)
const partial = normalizeEvaluation({ answers: { department: null, urgency: { score: 1.04 }, immediate: { noul: null } } }, scenario)
assert.equal(partial?.answers.urgency.score, 1.04)
const boundary = normalizeEvaluation({ answers: { department: { choice: 'billing', confidence: 1.2, probabilities: { billing: 0.8, support: Number.NaN, sales: -0.1 } }, urgency: { score: 3 }, immediate: { noul: 0 } } }, scenario)
assert.equal(boundary?.answers.department.confidence, undefined)
assert.deepEqual(boundary?.answers.department.probabilities, { billing: 0.8 })
assert.equal(boundary?.answers.urgency.score, 3)
for (const key of ['__proto__', 'constructor']) {
  const invalidChoice = normalizeEvaluation({ answers: { department: { choice: key } } }, scenario)
  assert.equal(invalidChoice, undefined)
}
const invalid = normalizeEvaluation({ answers: { urgency: { score: 3.01 }, immediate: { noul: Number.NaN } } }, scenario)
assert.equal(invalid, undefined)
