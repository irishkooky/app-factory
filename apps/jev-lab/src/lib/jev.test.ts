import assert from 'node:assert/strict'
import { scenarioById } from '../data/scenarios.ts'
import { normalizeEvaluation } from './jev.ts'
import { adaptVercelEvaluation, toVercelQuestions } from './vercel-jev.ts'
import { mapBatchResult, toBatchQuestions, validateBatchRequest } from './batch.ts'
import { batchScenarioById } from '../data/batch-scenarios.ts'

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

const gatewayQuestions = toVercelQuestions(scenario)
assert.equal(gatewayQuestions.immediate.type, 'boolean')
assert.deepEqual(Object.keys(gatewayQuestions.department).sort(), ['criteria', 'instructions', 'type'])
const gatewayResult = adaptVercelEvaluation({
  answers: {
    department: { type: 'choice', choice: 'billing', probabilities: { billing: 0.8, support: 0.2, sales: Number.NaN } },
    urgency: { type: 'score', score: 2.5 },
    immediate: { type: 'boolean', probability: 0.75 },
  },
  providerMetadata: { typesafe: { confidence: { department: 0.9, urgency: 1.2, immediate: 0.5 } } },
  usage: { inputTokens: 12, outputTokens: 7 },
  response: { modelId: 'typesafe-ai/jev' },
}, scenario)
assert.equal(gatewayResult?.answers.department.choice, 'billing')
assert.deepEqual(gatewayResult?.answers.department.probabilities, { billing: 0.8, support: 0.2 })
assert.equal(gatewayResult?.answers.urgency.score, 2.5)
assert.equal(gatewayResult?.answers.urgency.confidence, undefined)
assert.equal(gatewayResult?.answers.immediate.noul, 0.75)
assert.equal(gatewayResult?.answers.immediate.confidence, undefined)
assert.equal(gatewayResult?.usage?.input_tokens, 12)
assert.equal(adaptVercelEvaluation({ answers: { department: { choice: '__proto__' } } }, scenario), undefined)

const batchScenario = batchScenarioById('support')
assert.ok(batchScenario)
assert.equal(validateBatchRequest({ scenarioId: 'support', items: [{ id: 'a-1', text: ' 返金希望 ' }] })?.items[0].text, '返金希望')
assert.equal(validateBatchRequest({ scenarioId: 'support', items: [{ id: '__proto__', text: 'x' }] }), undefined)
assert.equal(validateBatchRequest({ scenarioId: 'support', items: [{ id: 'a', text: 'x' }, { id: 'a', text: 'y' }] }), undefined)
const batchItems = [{ id: 'a-1', text: '請求書をください' }, { id: 'a-2', text: '画面が白い' }]
const batchQuestions = toBatchQuestions(batchScenario, batchItems)
assert.equal(Object.keys(batchQuestions).length, 4)
const mapped = mapBatchResult({ answers: { item_0_route: { choice: 'billing', probabilities: { billing: .9 } }, item_0_priority: { score: 2 }, item_1_route: { choice: 'unknown' }, item_1_priority: { score: 1 } }, providerMetadata: { typesafe: { confidence: { item_0_route: .8 } } } }, batchScenario, batchItems)
assert.equal(mapped[0].route, 'billing')
assert.equal(mapped[0].selectedProbability, .9)
assert.equal(mapped[0].confidence, .8)
assert.equal(mapped[1].error, '評価結果を確認できませんでした。')

import {
  applyDecisions,
  createHallway,
  createParty,
  getActors,
  parseDecisions,
} from './comedy.ts'
import { mapComedyResult, validateComedyRequest } from '../server/comedy.ts'

const decide = (state: ReturnType<typeof createHallway> | ReturnType<typeof createParty>, action: string) =>
  getActors(state).map((actor) => ({ actorId: actor.id, action }))

const hallway = createHallway()
const afterFirstGo = applyDecisions(hallway, decide(hallway, 'go')) as ReturnType<typeof createHallway>
assert.equal(afterFirstGo.pairs[0].actors[0].x, 40)
assert.equal(afterFirstGo.pairs[0].actors[1].x, 60)
assert.equal(hallway.pairs[0].actors[0].x, 20)
const afterCollision = applyDecisions(afterFirstGo, decide(afterFirstGo, 'go')) as ReturnType<typeof createHallway>
assert.equal(afterCollision.pairs[0].actors[0].x, 40)
assert.equal(afterCollision.pairs[0].actors[1].x, 60)

let separated = createHallway()
separated = applyDecisions(separated, getActors(separated).map((actor) => ({
  actorId: actor.id,
  action: actor.id.endsWith('left') ? 'wall' : 'window',
}))) as ReturnType<typeof createHallway>
for (let index = 0; index < 4; index += 1) {
  separated = applyDecisions(separated, decide(separated, 'go')) as ReturnType<typeof createHallway>
}
assert.equal(separated.finished, true)
assert.equal(separated.pairs.flatMap((pair) => pair.actors).every((actor) => actor.passed), true)

const onePassed = createHallway()
onePassed.pairs[0].actors[0].passed = true
onePassed.pairs[0].actors[0].x = 100
const remainingBefore = onePassed.pairs[0].actors[1].x
const afterOnePassed = applyDecisions(onePassed, decide(onePassed, 'go')) as ReturnType<typeof createHallway>
assert.equal(afterOnePassed.pairs[0].actors[1].x, remainingBefore - 20)
assert.equal(afterOnePassed.pairs[0].actors[0].bubble, onePassed.pairs[0].actors[0].bubble)

let stalemate = createHallway()
for (let index = 0; index < 12; index += 1) {
  stalemate = applyDecisions(stalemate, decide(stalemate, 'wait')) as ReturnType<typeof createHallway>
}
assert.equal(stalemate.finished, true)
assert.equal(stalemate.ending, '廊下は今日も、譲り合いのまま。')
assert.equal(parseDecisions([{ actorId: 'p1-left', action: 'leave' }], createHallway()), undefined)

let party = createParty()
const prematureLeave = applyDecisions(party, decide(party, 'leave')) as ReturnType<typeof createParty>
assert.equal(prematureLeave.escaped, false)
party = applyDecisions(party, decide(party, 'announce')) as ReturnType<typeof createParty>
party = applyDecisions(party, decide(party, 'pay')) as ReturnType<typeof createParty>
party = applyDecisions(party, decide(party, 'coat')) as ReturnType<typeof createParty>
assert.equal(getActors(party)[0].actions.announce, undefined)
party = applyDecisions(party, decide(party, 'leave')) as ReturnType<typeof createParty>
assert.equal(party.escaped, true)


assert.equal(parseDecisions([{ actorId: 'guest', action: 'announce' }], party), undefined)
assert.equal(validateComedyRequest({ state: createParty() })?.state.kind, 'party')
assert.equal(validateComedyRequest({ state: { ...createParty(), extra: true } }), undefined)
const comedyResult = mapComedyResult({
  answers: { guest: { choice: 'announce', probabilities: { announce: 0.8 } } },
  providerMetadata: { typesafe: { confidence: { guest: 0.9 } } },
}, createParty())
assert.deepEqual(comedyResult, [{ actorId: 'guest', action: 'announce', probability: 0.8, confidence: 0.9 }])
assert.equal(mapComedyResult({ answers: { guest: { choice: 'unknown' } } }, createParty()), undefined)

assert.deepEqual(getActors(party), [])
assert.equal(parseDecisions([], party), undefined)
assert.throws(() => applyDecisions(party, []), /invalid decisions/)
assert.deepEqual(getActors(stalemate), [])
assert.throws(() => applyDecisions(stalemate, []), /invalid decisions/)

let stalledParty = createParty()
for (let index = 0; index < 12; index += 1) {
  stalledParty = applyDecisions(stalledParty, decide(stalledParty, 'wait')) as ReturnType<typeof createParty>
}
assert.equal(stalledParty.ending, '帰るタイミング、最後まで見つからず。')
assert.equal(stalledParty.bubble, '今じゃないか…')

let announcedParty = applyDecisions(createParty(), [{ actorId: 'guest', action: 'announce' }]) as ReturnType<typeof createParty>
for (let index = 0; index < 11; index += 1) {
  announcedParty = applyDecisions(announcedParty, decide(announcedParty, 'wait')) as ReturnType<typeof createParty>
}
assert.equal(announcedParty.ending, '「そろそろ帰る」から、もう12ターン。')
