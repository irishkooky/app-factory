import assert from 'node:assert/strict'
import {
  buildUiPlan,
  mapSemanticResult,
  parseSemanticResponse,
  toSemanticQuestions,
  validateSemanticRequest,
  validateStatic,
  type FormRecord,
  type SemanticDecision,
} from './semantic.ts'
import { batchRecords } from '../data/semantic-samples.ts'

const record: FormRecord = {
  id: 'record-1', name: '株式会社北極星', company: '山本花', email: 'hana@example.test', category: 'billing', message: '二重請求の返金について、請求番号INV-204を確認したいです。',
}
const decision: SemanticDecision = {
  id: record.id,
  identity: { choice: 'swapped', probability: 0.91 },
  company: { choice: 'person_like', probability: 0.95 },
  intent: { choice: 'billing', probability: 0.82 },
  detail: { choice: 'sufficient', probability: 0.9 },
}
const plan = buildUiPlan(record, decision)
assert.deepEqual(plan, { version: 1, nodes: [{ type: 'SwapFields' }] })
assert.deepEqual(buildUiPlan(record, { ...decision, identity: { choice: 'aligned', probability: 0.4 } }).nodes.at(-1), { type: 'NeedsReview', checks: ['identity'] })
assert.deepEqual(buildUiPlan({ ...record, category: 'support' }, { ...decision, identity: { choice: 'aligned', probability: 0.9 } }).nodes, [{ type: 'ConfirmCompany' }, { type: 'SuggestCategory', category: 'billing' }])
assert.deepEqual(buildUiPlan(record, { ...decision, detail: { choice: 'vague', probability: 0.7 } }).nodes.at(-1), { type: 'AskDetails', intent: 'billing' })
assert.equal(validateStatic(record).message, undefined)
assert.ok(validateStatic({ ...record, company: '灯台コーヒー' }).company === undefined)
assert.ok(validateStatic({ ...record, email: 'bad' }).email)

assert.equal(validateSemanticRequest({ records: [record] })?.records[0].name, record.name)
assert.equal(validateSemanticRequest({ records: [{ ...record, id: '__proto__' }] }), undefined)
assert.equal(validateSemanticRequest({ records: [{ ...record, extra: true }] }), undefined)
assert.equal(validateSemanticRequest({ records: Array.from({ length: 9 }, (_, index) => ({ ...record, id: `r-${index}` })) }), undefined)
assert.equal(validateSemanticRequest({ records: [{ ...record, id: 'same' }, { ...record, id: 'same' }] }), undefined)

const questions = toSemanticQuestions(batchRecords)
assert.equal(Object.keys(questions).length, 32)
assert.match(questions.r0_identity.instructions, /state\.records\[0\]/)
assert.match(questions.r0_identity.instructions, new RegExp(batchRecords[0].id))

const raw = {
  answers: {
    r0_identity: { choice: 'swapped', probabilities: { swapped: 0.91 } },
    r0_company: { choice: 'person_like', probabilities: { person_like: 0.95 } },
    r0_intent: { choice: 'billing', probabilities: { billing: 0.82 } },
    r0_detail: { choice: 'sufficient', probabilities: { sufficient: 0.9 } },
  },
}
const mapped = mapSemanticResult(raw, [record])
assert.equal(mapped?.[0].decision.identity.probability, 0.91)
assert.equal(mapSemanticResult({ answers: { ...raw.answers, r0_intent: { choice: 'wrong' } } }, [record]), undefined)
assert.equal(mapSemanticResult({ answers: { ...raw.answers, r0_detail: { choice: 'sufficient', probabilities: { sufficient: 1.1 } } } }, [record]), undefined)

const parsed = parseSemanticResponse({ results: [{ id: record.id, decision, plan: { version: 1, nodes: [{ type: 'Ready', injected: true }] } }], elapsedMs: 12.5 }, [record])
assert.deepEqual(parsed?.results[0].plan, plan)
assert.equal(parseSemanticResponse({ results: [], elapsedMs: 1 }, [record]), undefined)
assert.equal(parseSemanticResponse({ results: [{ id: record.id, decision: { ...decision, detail: { choice: 'broken' } }, plan: {} }], elapsedMs: 1 }, [record]), undefined)
