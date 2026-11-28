import { useCallback, useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Badge,
  Box,
  Button,
  Group,
  Image,
  Loader,
  Paper,
  Rating,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { DrynessScale } from "../components/DrynessScale";
import { canRetryAnalysis } from "../lib/analysis-state";
import { deleteSakeRecord, getSakeRecord, updateSakeRecord } from "../lib/db";
import { startLabelAnalysis, subscribeSakeChanges } from "../lib/run-analysis";
import type { Dryness, SakeRecord } from "../lib/types";

export const Route = createFileRoute("/entry/$entryId")({
  component: EntryDetailPage,
});

function EntryDetailPage() {
  const { entryId } = Route.useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<SakeRecord | null>(null);
  const [memo, setMemo] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const recordRef = useRef(record);
  const memoFocused = useRef(false);
  const memoWriting = useRef(false);
  const seenEntryId = useRef(entryId);
  recordRef.current = record;
  if (seenEntryId.current !== entryId) {
    seenEntryId.current = entryId;
    memoFocused.current = false;
    memoWriting.current = false;
  }

  const load = useCallback(async () => {
    const data = await getSakeRecord(entryId);
    setRecord(data);
    setMissing(!data);
    setLoading(false);
    if (!data) {
      setMemo("");
      return;
    }
    if (!memoFocused.current && !memoWriting.current) setMemo(data.memo);
  }, [entryId]);

  useEffect(() => {
    void load();
    return subscribeSakeChanges(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (record?.analysisStatus === "pending") void startLabelAnalysis(record.id);
  }, [record]);

  const imageBlob = record?.image;
  useEffect(() => {
    if (!imageBlob) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageBlob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageBlob]);

  async function changeRating(value: number) {
    const current = recordRef.current;
    if (!current) return;
    if (!Number.isInteger(value) || value < 1 || value > 5) return;
    setRecord({ ...current, rating: value });
    await updateSakeRecord(current.id, { rating: value });
  }

  async function changeDryness(step: Dryness) {
    const current = recordRef.current;
    if (!current) return;
    const dryness = current.dryness === step ? null : step;
    setRecord({ ...current, dryness });
    await updateSakeRecord(current.id, { dryness });
  }

  async function saveMemo(raw: string) {
    const current = recordRef.current;
    if (!current) return;
    const next = raw.trim();
    setMemo(next);
    if (next === current.memo) return;
    memoWriting.current = true;
    setRecord({ ...current, memo: next });
    try {
      await updateSakeRecord(current.id, { memo: next });
    } finally {
      memoWriting.current = false;
    }
  }

  async function remove() {
    const current = recordRef.current;
    if (!current) return;
    if (!window.confirm("この記録を削除しますか？")) return;
    await deleteSakeRecord(current.id);
    await navigate({ to: "/" });
  }

  if (loading) return <Loader mx="auto" mt="xl" />;

  if (missing || !record) {
    return (
      <Stack p="md">
        <Text>記録が見つかりません</Text>
        <Button component={Link} to="/">
          一覧へ戻る
        </Button>
      </Stack>
    );
  }

  const { label } = record;

  return (
    <Box mih="100dvh" px="md" py="md" maw={480} mx="auto" pb={40}>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>詳細</Title>
          <Button component={Link} to="/" variant="subtle" size="compact-sm">
            一覧
          </Button>
        </Group>

        {imageUrl ? (
          <Image src={imageUrl} alt={label.brandName || "ラベル写真"} radius="md" fit="contain" />
        ) : null}

        <Stack gap={4} align="flex-start">
          <Text size="sm">おいしかった？</Text>
          <Rating
            value={record.rating ?? 0}
            onChange={(value) => void changeRating(value)}
            size="lg"
          />
        </Stack>

        <DrynessScale value={record.dryness} onChange={(step) => void changeDryness(step)} />

        <Textarea
          label="感想"
          autosize
          minRows={1}
          maxRows={2}
          value={memo}
          onChange={(event) => setMemo(event.currentTarget.value)}
          onFocus={() => {
            memoFocused.current = true;
          }}
          onBlur={(event) => {
            memoFocused.current = false;
            void saveMemo(event.currentTarget.value);
          }}
        />

        {record.analysisStatus === "pending" ? (
          <Text size="sm" c="dimmed">
            AI解析中…
          </Text>
        ) : null}

        {record.analysisStatus === "done" ? (
          <Paper withBorder radius="md" p="md">
            <Stack gap="xs">
              <Title order={2}>{label.brandName || "銘柄名なし"}</Title>
              {label.brewery ? <Text>{label.brewery}</Text> : null}
              <Group gap="xs">
                {label.classification ? (
                  <Badge tt="none" variant="light" color="grape">
                    {label.classification}
                  </Badge>
                ) : null}
                {label.region ? (
                  <Badge tt="none" variant="light" color="gray">
                    {label.region}
                  </Badge>
                ) : null}
              </Group>
              {label.tasteHints ? (
                <Text size="sm" c="dimmed">
                  {label.tasteHints}
                </Text>
              ) : null}
            </Stack>
          </Paper>
        ) : null}

        {canRetryAnalysis(record.analysisStatus) ? (
          <Stack gap={6}>
            <Text size="sm" c="dimmed">
              {record.analysisError || "解析できませんでした"}
            </Text>
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => void startLabelAnalysis(record.id)}
            >
              解析を再試行
            </Button>
          </Stack>
        ) : null}

        <Button color="red" variant="outline" onClick={() => void remove()}>
          削除
        </Button>
      </Stack>
    </Box>
  );
}
