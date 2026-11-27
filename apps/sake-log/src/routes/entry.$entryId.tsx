import { useCallback, useEffect, useState } from "react";
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
  Title,
} from "@mantine/core";
import { deleteSakeRecord, getSakeRecord, updateSakeRecord } from "../lib/db";
import { canRetryAnalysis } from "../lib/analysis-state";
import { startLabelAnalysis, subscribeSakeChanges } from "../lib/run-analysis";
import type { SakeRecord } from "../lib/types";

export const Route = createFileRoute("/entry/$entryId")({
  component: EntryDetailPage,
});

function EntryDetailPage() {
  const { entryId } = Route.useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<SakeRecord | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const data = await getSakeRecord(entryId);
    setRecord(data);
    setMissing(!data);
    setLoading(false);
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

  useEffect(() => {
    if (!record) return;
    const url = URL.createObjectURL(record.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [record]);

  async function changeRating(value: number) {
    if (!record || value < 1) return;
    setRecord({ ...record, rating: value });
    await updateSakeRecord(record.id, { rating: value });
  }

  async function remove() {
    if (!record) return;
    if (!window.confirm("この記録を削除しますか？")) return;
    await deleteSakeRecord(record.id);
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
          <Text size="sm" c="dimmed">
            評価
          </Text>
          <Rating
            value={record.rating}
            onChange={(value) => void changeRating(value ?? record.rating)}
            size="lg"
          />
        </Stack>

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
