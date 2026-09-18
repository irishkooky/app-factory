import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Progress,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import {
  scenarios,
  type Mode,
  type Question,
  type Scenario,
} from "../data/scenarios";
import type { Evaluation } from "../lib/jev";
import "./index.css";

export const Route = createFileRoute("/")({ component: Home });

type ApiResponse = { result?: Evaluation; elapsedMs?: number; error?: string };
class EvaluationRequestError extends Error {}
const percent = (value: number) => Math.round(value * 100);
const questionLabel = (
  question: Question,
  answer: Evaluation["answers"][string],
) => {
  if (question.type === "choice")
    return answer.choice ? question.criteria[answer.choice] : "未取得";
  if (question.type === "score") {
    const rounded = Math.round(answer.score ?? 0);
    return answer.score === undefined
      ? "未取得"
      : `${question.criteria[rounded]}（${answer.score.toFixed(2)} / ${question.criteria.length - 1}）`;
  }
  if (answer.noul === undefined) return "未取得";
  const isTrue = answer.noul >= 0.5;
  return `${isTrue ? question.criteria.true : question.criteria.false}（${percent(isTrue ? answer.noul : 1 - answer.noul)}%）`;
};

function Home() {
  const [mode, setMode] = useState<Mode>("work");
  const modeScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.mode === mode),
    [mode],
  );
  const [scenarioId, setScenarioId] = useState("support");
  const scenario =
    scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const [text, setText] = useState(scenario.samples[0]);
  const [result, setResult] = useState<Evaluation>();
  const [elapsed, setElapsed] = useState<number>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [photo, setPhoto] = useState(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const clearEvaluation = () => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = undefined;
    setLoading(false);
    setResult(undefined);
    setElapsed(undefined);
    setError(undefined);
    setRevealed(false);
  };
  const select = (next: Scenario) => {
    clearEvaluation();
    setScenarioId(next.id);
    setText(next.samples[0]);
  };
  const changeMode = (next: string) => {
    const nextMode = next as Mode;
    setMode(nextMode);
    const nextScenario = scenarios.find((item) => item.mode === nextMode);
    if (nextScenario) select(nextScenario);
  };
  const run = async () => {
    abortRef.current?.abort();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    setRevealed(false);
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, text }),
        signal: controller.signal,
      });
      const isJson = response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("application/json");
      let data: ApiResponse | undefined;
      if (isJson) {
        try {
          data = (await response.json()) as ApiResponse;
        } catch {
          data = undefined;
        }
      }
      if (requestId !== requestIdRef.current) return;
      const evaluation = data?.result;
      if (!response.ok || !evaluation)
        throw new EvaluationRequestError(
          data?.error ??
            "評価サービスに一時的な問題が発生しました。少ししてから再試行してください。",
        );
      setResult(evaluation);
      setElapsed(data?.elapsedMs);
    } catch (cause) {
      if (requestId !== requestIdRef.current || controller.signal.aborted)
        return;
      setError(
        cause instanceof EvaluationRequestError
          ? cause.message
          : "通信または評価サービスに問題が発生しました。少ししてから再試行してください。",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        abortRef.current = undefined;
      }
    }
  };
  const accent = mode === "fun" ? "fun-accent" : "";
  return (
    <main className={`jev-shell ${photo ? "shooting" : ""}`}>
      <Container size="xl">
        <nav className="jev-nav">
          <Group justify="space-between">
            <Text className="jev-mark">Jev 実験室</Text>
            <Badge
              variant="outline"
              color={mode === "fun" ? "orange" : "indigo"}
              tt="none"
            >
              Cloudflare Workers · Vercel AI Gateway
            </Badge>
          </Group>
        </nav>
        <section className="jev-hero">
          <Text className={`jev-kicker ${accent}`}>JUDGMENT, MADE VISIBLE</Text>
          <h1 className="jev-title">
            判断を、
            <br />
            少し軽く。
          </h1>
          <Text className="jev-subtitle">
            仕事の小さな迷いも、どうでもいい議題も。Jev
            が固定したものさしで、ひとつずつ評価します。
          </Text>
        </section>
        <SegmentedControl
          className="mode-control"
          fullWidth
          value={mode}
          onChange={changeMode}
          data={[
            { label: "実務の実験", value: "work" },
            { label: "無駄遣いの実験", value: "fun" },
          ]}
          color={mode === "fun" ? "orange" : "indigo"}
        />
        <section className="scenario-list" aria-label="企画を選ぶ">
          {modeScenarios.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`scenario-button ${item.mode === "fun" ? "fun" : ""} ${item.id === scenario.id ? "selected" : ""}`}
              onClick={() => select(item)}
            >
              <span className="scenario-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="scenario-name">{item.title}</span>
            </button>
          ))}
        </section>
        <section className="workspace">
          <section className="panel">
            <Stack gap="md">
              <div>
                <Text className={`panel-label ${accent}`}>
                  INPUT / {scenario.id.toUpperCase()}
                </Text>
                <Title order={2} mt={7}>
                  {scenario.title}
                </Title>
                <Text c="dimmed" mt={6}>
                  {scenario.description}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={700} mb={8}>
                  サンプルを入れる
                </Text>
                <div className="sample-buttons">
                  {scenario.samples.map((sample, index) => (
                    <Button
                      key={sample}
                      variant="default"
                      size="xs"
                      onClick={() => {
                        clearEvaluation();
                        setText(sample);
                      }}
                    >
                      例 {index + 1}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                label={scenario.inputLabel}
                value={text}
                onChange={(event) => {
                  clearEvaluation();
                  setText(event.currentTarget.value);
                }}
                minRows={8}
                maxLength={4000}
                autosize
              />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {text.length} / 4000
                </Text>
                <Button
                  color={mode === "fun" ? "orange" : "indigo"}
                  onClick={run}
                  loading={loading}
                  disabled={!text.trim()}
                >
                  Jev に評価してもらう
                </Button>
              </Group>
              {error && (
                <Alert color="red" title="評価できませんでした">
                  {error}
                  <Button
                    variant="subtle"
                    color="red"
                    size="compact-sm"
                    onClick={run}
                  >
                    再試行
                  </Button>
                </Alert>
              )}
            </Stack>
          </section>
          <section className={`panel ${photo ? "photo" : ""}`}>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text className={`panel-label ${accent}`}>RESULT</Text>
                  <Title order={2} mt={7}>
                    評価結果
                  </Title>
                </div>
                <Switch
                  label="撮影モード"
                  checked={photo}
                  onChange={(event) => setPhoto(event.currentTarget.checked)}
                  color={mode === "fun" ? "orange" : "indigo"}
                />
              </Group>
              {!result && (
                <div className="result-empty">
                  入力を整えたら、評価ボタンを押してください。
                  <br />
                  結果はクリックしたときだけ取得します。
                </div>
              )}
              {result && !revealed && (
                <div className="reveal">
                  <Stack align="center">
                    <Text fw={700}>結果を準備しました</Text>
                    <Button
                      color={mode === "fun" ? "orange" : "indigo"}
                      onClick={() => setRevealed(true)}
                    >
                      発表する
                    </Button>
                    <Text size="xs" c="dimmed">
                      撮影前なら、ここで少し間をつくれます。
                    </Text>
                  </Stack>
                </div>
              )}
              {result && revealed && (
                <>
                  <Group justify="space-between">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-sm"
                      onClick={() => setRevealed(false)}
                    >
                      結果を隠す
                    </Button>
                    {!photo && (
                      <Text size="xs" c="dimmed">
                        {result.model ?? "Jev"} ·{" "}
                        {elapsed ? `${(elapsed / 1000).toFixed(1)}秒` : ""}
                      </Text>
                    )}
                  </Group>
                  {scenario.questions.map((question) => {
                    const answer = result.answers[question.key];
                    const selectedProbability =
                      question.type === "choice" && answer?.choice
                        ? answer.probabilities?.[answer.choice]
                        : undefined;
                    return (
                      <div className="answer-card" key={question.key}>
                        <Text size="sm" fw={700} c="dimmed">
                          {question.label}
                        </Text>
                        <div className="answer-value">
                          {answer ? questionLabel(question, answer) : "未取得"}
                        </div>
                        {answer?.confidence !== undefined && !photo && (
                          <Text className="metric">
                            モデルの確信度: {percent(answer.confidence)}%
                          </Text>
                        )}
                        {question.type === "choice" &&
                          selectedProbability !== undefined &&
                          !photo && (
                            <>
                              <Progress
                                value={percent(selectedProbability)}
                                color={mode === "fun" ? "orange" : "indigo"}
                                mt="xs"
                              />
                              <Text className="metric">
                                選択肢の該当確率: {" "}
                                {answer.choice
                                  ? `${question.criteria[answer.choice]} ${percent(selectedProbability)}%`
                                  : "未取得"}
                              </Text>
                              <Text className="metric">
                                分布: {Object.entries(answer.probabilities ?? {})
                                  .filter(([key]) => question.criteria[key])
                                  .map(
                                    ([key, value]) =>
                                      `${question.criteria[key]} ${percent(value)}%`,
                                  )
                                  .join(" / ") || "未取得"}
                              </Text>
                            </>
                          )}
                        {question.type === "score" &&
                          answer?.score !== undefined &&
                          !photo && (
                            <Text className="metric">
                              換算スコア:{" "}
                              {Math.round(
                                (answer.score /
                                  Math.max(question.criteria.length - 1, 1)) *
                                  100,
                              )}{" "}
                              / 100
                            </Text>
                          )}
                        {question.type === "noul" &&
                          answer?.noul !== undefined &&
                          !photo && (
                        <Text className="metric">
                          該当確率（「{question.criteria.true}」）: {percent(answer.noul)}%
                        </Text>
                          )}
                      </div>
                    );
                  })}
                  {!photo && result.usage && (
                    <Text size="xs" c="dimmed">
                      tokens: {result.usage.input_tokens ?? "—"} in /{" "}
                      {result.usage.output_tokens ?? "—"} out
                    </Text>
                  )}
                </>
              )}
            </Stack>
          </section>
        </section>
        <Text size="xs" c="dimmed" pb="xl">
          Jev の出力は判断の補助です。重要な決定は状況を確認して行ってください。
        </Text>
      </Container>
    </main>
  );
}
