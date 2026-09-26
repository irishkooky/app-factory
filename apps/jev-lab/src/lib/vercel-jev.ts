import type { Experimental_EvaluationQuestion } from 'ai'
import type { Scenario } from '../data/scenarios'
import type { Answer, Evaluation } from './jev'

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
const finite = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
const probability = (value: unknown) => {
  const parsed = finite(value)
  return parsed !== undefined && parsed >= 0 && parsed <= 1 ? parsed : undefined
}
const distribution = (value: unknown): Record<string, number> | undefined => {
  const source = record(value)
  if (!source) return undefined
  const output: Record<string, number> = {}
  for (const [key, candidate] of Object.entries(source)) {
    const parsed = probability(candidate)
    if (parsed !== undefined) output[key] = parsed
  }
  return output
}

export function toVercelQuestions(
  scenario: Scenario,
): Record<string, Experimental_EvaluationQuestion> {
  const questions: Record<string, Experimental_EvaluationQuestion> = {}
  for (const question of scenario.questions) {
    if (question.type === 'noul') {
      questions[question.key] = {
        type: 'boolean',
        instructions: question.instructions,
        criteria: question.criteria,
      }
    }
    if (question.type === 'choice') {
      questions[question.key] = {
        type: 'choice',
        instructions: question.instructions,
        criteria: question.criteria,
      }
    }
    if (question.type === 'score') {
      questions[question.key] = {
        type: 'score',
        instructions: question.instructions,
        criteria: question.criteria,
      }
    }
  }
  return questions
}

export function adaptVercelEvaluation(
  raw: unknown,
  scenario: Scenario,
): Evaluation | undefined {
  const root = record(raw)
  const rawAnswers = root && record(root.answers)
  if (!root || !rawAnswers) return undefined
  const metadata = record(record(root.providerMetadata)?.typesafe)
  const confidences = record(metadata?.confidence)
  const answers: Record<string, Answer> = {}
  for (const question of scenario.questions) {
    const source = record(rawAnswers[question.key])
    if (!source) continue
    const confidence = question.type === 'noul'
      ? undefined
      : probability(confidences?.[question.key])
    if (question.type === 'choice') {
      const choice = typeof source.choice === 'string' && Object.hasOwn(question.criteria, source.choice)
        ? source.choice
        : undefined
      if (choice) answers[question.key] = { type: 'choice', choice, confidence, probabilities: distribution(source.probabilities) }
    }
    if (question.type === 'score') {
      const score = finite(source.score)
      if (score !== undefined && score >= 0 && score <= question.criteria.length - 1) {
        answers[question.key] = { type: 'score', score, confidence }
      }
    }
    if (question.type === 'noul') {
      const noul = probability(source.probability)
      if (noul !== undefined) answers[question.key] = { type: 'noul', noul, confidence }
    }
  }
  if (!Object.keys(answers).length) return undefined
  const response = record(root.response)
  const usage = record(root.usage)
  return {
    model: typeof response?.modelId === 'string' ? response.modelId : undefined,
    answers,
    usage: usage ? { input_tokens: finite(usage.inputTokens), output_tokens: finite(usage.outputTokens) } : undefined,
  }
}
