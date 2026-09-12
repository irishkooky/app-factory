import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Button,
  Card,
  Container,
  Loader,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import {
  DEFAULT_DRAFT,
  LIMITS,
  RATIOS,
  RESOLUTIONS,
  failureMessageJa,
  parseGenerateRequest,
  type DraftField,
  type GenerateDraft,
  type JobFailure,
} from '../video/job'
import { canGenerate, useVideoSession, type Screen } from '../video/session'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const RATIO_LABELS: Record<(typeof RATIOS)[number], string> = {
  '16:9': '横向き 16:9',
  '9:16': '縦向き 9:16',
}

function HomeComponent() {
  const [draft, setDraft] = useState<GenerateDraft>(DEFAULT_DRAFT)
  const [issues, setIssues] = useState<Partial<Record<DraftField, string>>>({})
  const session = useVideoSession()
  const disabled = !canGenerate(session.screen)

  const handleSubmit = () => {
    const parsed = parseGenerateRequest(draft)
    if (!parsed.ok) {
      const next: Partial<Record<DraftField, string>> = {}
      for (const issue of parsed.issues) {
        next[issue.field] = issue.messageJa
      }
      setIssues(next)
      return
    }
    setIssues({})
    session.generate(parsed.value)
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>テキストから動画をつくる</Title>
        <Text c="dimmed">プロンプトを書いて生成すると、数分で動画が再生できます。</Text>

        <GenerateForm
          draft={draft}
          issues={issues}
          disabled={disabled}
          submitting={session.screen.kind === 'submitting'}
          onChange={(next) => {
            setDraft(next)
            if (Object.keys(issues).length > 0) setIssues({})
          }}
          onSubmit={handleSubmit}
        />

        <JobPanel screen={session.screen} onReset={session.reset} />
      </Stack>
    </Container>
  )
}

function GenerateForm(props: {
  draft: GenerateDraft
  issues: Partial<Record<DraftField, string>>
  disabled: boolean
  submitting: boolean
  onChange: (next: GenerateDraft) => void
  onSubmit: () => void
}) {
  const { draft, issues, disabled, submitting, onChange, onSubmit } = props

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Textarea
          label="プロンプト"
          placeholder="例: 夕暮れの港で猫が歩いている"
          autosize
          minRows={4}
          maxLength={LIMITS.promptMaxChars}
          value={draft.prompt}
          error={issues.prompt}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, prompt: event.currentTarget.value })}
        />

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            解像度
          </Text>
          <SegmentedControl
            fullWidth
            disabled={disabled}
            value={draft.resolution}
            onChange={(value) => onChange({ ...draft, resolution: value as GenerateDraft['resolution'] })}
            data={RESOLUTIONS.map((value) => ({ value, label: value }))}
          />
          {issues.resolution ? (
            <Text size="xs" c="red">
              {issues.resolution}
            </Text>
          ) : null}
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            縦横比
          </Text>
          <SegmentedControl
            fullWidth
            disabled={disabled}
            value={draft.ratio}
            onChange={(value) => onChange({ ...draft, ratio: value as GenerateDraft['ratio'] })}
            data={RATIOS.map((value) => ({ value, label: RATIO_LABELS[value] }))}
          />
          {issues.ratio ? (
            <Text size="xs" c="red">
              {issues.ratio}
            </Text>
          ) : null}
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            長さ {draft.duration}秒
          </Text>
          <Slider
            min={LIMITS.durationMin}
            max={LIMITS.durationMax}
            step={1}
            value={draft.duration}
            disabled={disabled}
            marks={[
              { value: LIMITS.durationMin, label: `${LIMITS.durationMin}` },
              { value: LIMITS.durationMax, label: `${LIMITS.durationMax}` },
            ]}
            onChange={(value) => onChange({ ...draft, duration: value })}
          />
          {issues.duration ? (
            <Text size="xs" c="red">
              {issues.duration}
            </Text>
          ) : null}
        </Stack>

        <Switch
          label="音声を付ける"
          checked={draft.audio}
          disabled={disabled}
          error={issues.audio}
          onChange={(event) => onChange({ ...draft, audio: event.currentTarget.checked })}
        />

        <Button fullWidth onClick={onSubmit} disabled={disabled} loading={submitting}>
          動画を生成する
        </Button>
      </Stack>
    </Card>
  )
}

function JobPanel(props: { screen: Screen; onReset: () => void }) {
  const { screen, onReset } = props

  switch (screen.kind) {
    case 'idle':
      return null
    case 'submitting':
      return (
        <StatusCard>
          <Loader size="sm" />
          <Text>送信中</Text>
        </StatusCard>
      )
    case 'rejected':
      return (
        <Alert color="red" variant="light" title="送信できませんでした">
          <Stack gap="sm">
            <Text size="sm">{screen.message}</Text>
            <Button variant="light" color="red" onClick={onReset} w="fit-content">
              やり直す
            </Button>
          </Stack>
        </Alert>
      )
    case 'resuming':
      return (
        <StatusCard>
          <Loader size="sm" />
          <Text>前回の生成を確認しています</Text>
          {screen.pollFailures > 0 ? (
            <Text size="sm" c="dimmed">
              接続できません。再試行中
            </Text>
          ) : null}
          <Button variant="subtle" onClick={onReset} w="fit-content">
            最初からやり直す
          </Button>
        </StatusCard>
      )
    case 'polling':
      return (
        <StatusCard>
          <Loader size="sm" />
          <Text>{screen.job.state.status === 'queued' ? '順番待ち' : '生成中'}</Text>
          <ElapsedText submittedAt={screen.job.ref.submittedAt} />
          {screen.pollFailures > 0 ? (
            <Text size="sm" c="dimmed">
              接続できません。再試行中
            </Text>
          ) : null}
          <Button variant="subtle" onClick={onReset} w="fit-content">
            最初からやり直す
          </Button>
        </StatusCard>
      )
    case 'done':
      return <DonePanel screen={screen} onReset={onReset} />
    default: {
      const _exhaustive: never = screen
      return _exhaustive
    }
  }
}

function DonePanel(props: { screen: Extract<Screen, { kind: 'done' }>; onReset: () => void }) {
  const { screen, onReset } = props
  const { state } = screen.job

  switch (state.status) {
    case 'succeeded':
      return (
        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <video src={state.videoUrl} controls playsInline style={{ width: '100%', borderRadius: 8 }} />
            <Alert color="yellow" variant="light">
              再生リンクは約24時間で無効になります
            </Alert>
            <Button component="a" href={state.videoUrl} target="_blank" rel="noreferrer" variant="light">
              ダウンロード
            </Button>
            <Button variant="subtle" onClick={onReset} w="fit-content">
              もう一度生成
            </Button>
          </Stack>
        </Card>
      )
    case 'failed':
      return (
        <Alert color="red" variant="light" title="生成に失敗しました">
          <Stack gap="sm">
            <Text size="sm">{failureMessageJa(state.failure)}</Text>
            <FailureHint failure={state.failure} />
            <Button variant="light" color="red" onClick={onReset} w="fit-content">
              やり直す
            </Button>
          </Stack>
        </Alert>
      )
    case 'canceled':
      return (
        <Alert color="orange" variant="light" title="キャンセルされました">
          <Button variant="light" onClick={onReset} w="fit-content">
            やり直す
          </Button>
        </Alert>
      )
    default: {
      const _exhaustive: never = state
      return _exhaustive
    }
  }
}

function FailureHint(props: { failure: JobFailure }) {
  if (props.failure.kind !== 'misconfigured') return null
  return (
    <Text size="sm" c="dimmed">
      ローカルでは .dev.vars にシークレットを書き、本番では wrangler secret で同じ名前を設定してください。
    </Text>
  )
}

function StatusCard(props: { children: ReactNode }) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm" align="flex-start">
        {props.children}
      </Stack>
    </Card>
  )
}

function ElapsedText(props: { submittedAt: number }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(handle)
  }, [])

  const seconds = Math.max(0, Math.floor((now - props.submittedAt) / 1000))
  return <Text size="sm" c="dimmed">{`経過 ${seconds}秒`}</Text>
}
