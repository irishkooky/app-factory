import type { Question, Scenario } from "../data/scenarios";

export type Answer = {
  type: Question["type"];
  choice?: string;
  score?: number;
  noul?: number;
  confidence?: number;
  probabilities?: Record<string, number>;
};
export type Evaluation = {
  model?: string;
  answers: Record<string, Answer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};
const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const probability = (value: unknown) => {
  const parsed = number(value);
  return parsed !== undefined && parsed >= 0 && parsed <= 1
    ? parsed
    : undefined;
};
const probabilities = (value: unknown): Record<string, number> | undefined => {
  const item = record(value);
  if (!item) return undefined;
  const output: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(item)) {
    const parsed = probability(candidate);
    if (parsed !== undefined) output[key] = parsed;
  }
  return output;
};

export function normalizeEvaluation(
  raw: unknown,
  scenario: Scenario,
): Evaluation | undefined {
  const root = record(raw);
  const rawAnswers = root && record(root.answers);
  if (!root || !rawAnswers) return undefined;
  const answers: Record<string, Answer> = {};
  for (const question of scenario.questions) {
    const source = record(rawAnswers[question.key]);
    if (!source) continue;
    const confidence = probability(source.confidence);
    if (question.type === "choice") {
      const value =
        typeof source.choice === "string" &&
        Object.hasOwn(question.criteria, source.choice)
          ? source.choice
          : undefined;
      if (value)
        answers[question.key] = {
          type: question.type,
          choice: value,
          confidence,
          probabilities: probabilities(source.probabilities),
        };
    }
    if (question.type === "score") {
      const value = number(source.score);
      if (
        value !== undefined &&
        value >= 0 &&
        value <= question.criteria.length - 1
      )
        answers[question.key] = {
          type: question.type,
          score: value,
          confidence,
        };
    }
    if (question.type === "noul") {
      const value = probability(source.noul);
      if (value !== undefined)
        answers[question.key] = {
          type: question.type,
          noul: value,
          confidence,
        };
    }
  }
  if (!Object.keys(answers).length) return undefined;
  const usage = record(root.usage);
  return {
    model: typeof root.model === "string" ? root.model : undefined,
    answers,
    usage: usage
      ? {
          input_tokens: number(usage.input_tokens),
          output_tokens: number(usage.output_tokens),
        }
      : undefined,
  };
}
