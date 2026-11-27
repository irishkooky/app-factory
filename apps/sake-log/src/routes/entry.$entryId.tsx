import { useCallback, useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Alert,
  Box,
  Button,
  Group,
  Image,
  Loader,
  Rating,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { blobToBase64 } from "../lib/blob";
import { deleteSakeRecord, getSakeRecord, updateSakeRecord } from "../lib/db";
import { EMPTY_LABEL, type SakeLabelInfo, type SakeRecord } from "../lib/types";
import { analyzeSakeLabel } from "../server/analyze-label";

export const Route = createFileRoute("/entry/$entryId")({
  component: EntryDetailPage,
});

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function EntryDetailPage() {
  const { entryId } = Route.useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<SakeRecord | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(3);
  const [memo, setMemo] = useState("");
  const [label, setLabel] = useState<SakeLabelInfo>({ ...EMPTY_LABEL });
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getSakeRecord(entryId);
    setRecord(data);
    if (data) {
      setRating(data.rating);
      setMemo(data.memo);
      setLabel(data.label);
    }
    setLoading(false);
  }, [entryId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!record) return;
    const url = URL.createObjectURL(record.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [record]);

  async function save() {
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      const next = await updateSakeRecord(record.id, { rating, memo, label });
      setRecord(next);
      setMessage("保存しました");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function runAi() {
    if (!record) return;
    setAiBusy(true);
    setError(null);
    setMessage(null);
    try {
      const base64 = await blobToBase64(record.image);
      const result = await analyzeSakeLabel({
        data: { imageBase64: base64, mimeType: record.imageMime },
      });
      setLabel({ ...EMPTY_LABEL, ...result });
      const next = await updateSakeRecord(record.id, { label: result });
      setRecord(next);
      setMessage("ラベルを解析しました。必要なら手で直してください。");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAiBusy(false);
    }
  }

  async function remove() {
    if (!record) return;
    if (!window.confirm("この記録を削除しますか？")) return;
    await deleteSakeRecord(record.id);
    await navigate({ to: "/" });
  }

  if (loading) {
    return <Loader mx="auto" mt="xl" />;
  }

  if (!record) {
    return (
      <Stack p="md">
        <Alert color="orange">記録が見つかりません</Alert>
        <Button component={Link} to="/">
          一覧へ戻る
        </Button>
      </Stack>
    );
  }

  return (
    <Box mih="100dvh" px="md" py="md" maw={480} mx="auto" pb={80}>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>詳細</Title>
          <Button component={Link} to="/" variant="subtle" size="compact-sm">
            一覧
          </Button>
        </Group>

        {imageUrl ? <Image src={imageUrl} alt="ラベル写真" radius="md" fit="contain" /> : null}

        {message ? (
          <Alert color="green" title="完了">
            {message}
          </Alert>
        ) : null}
        {error ? (
          <Alert color="red" title="エラー">
            {error}
          </Alert>
        ) : null}

        <Stack gap={4}>
          <Text size="sm" fw={600}>
            評価
          </Text>
          <Rating value={rating} onChange={(v) => setRating(v ?? record?.rating ?? 3)} size="lg" />
        </Stack>

        <Textarea
          label="ひとことメモ"
          value={memo}
          onChange={(e) => setMemo(e.currentTarget.value)}
          minRows={2}
          autosize
        />

        <Title order={5}>銘柄情報</Title>
        <TextInput
          data-testid="sake-brand-name"
          label="銘柄名"
          value={label.brandName}
          onChange={(e) => setLabel((prev) => ({ ...prev, brandName: e.currentTarget.value }))}
        />
        <TextInput
          data-testid="sake-brewery"
          label="酒蔵"
          value={label.brewery}
          onChange={(e) => setLabel((prev) => ({ ...prev, brewery: e.currentTarget.value }))}
        />
        <TextInput
          data-testid="sake-classification"
          label="特定名称"
          value={label.classification}
          onChange={(e) => setLabel((prev) => ({ ...prev, classification: e.currentTarget.value }))}
        />
        <TextInput
          data-testid="sake-region"
          label="産地"
          value={label.region}
          onChange={(e) => setLabel((prev) => ({ ...prev, region: e.currentTarget.value }))}
        />
        <Textarea
          data-testid="sake-taste-hints"
          label="味わいメモ候補"
          value={label.tasteHints}
          onChange={(e) => setLabel((prev) => ({ ...prev, tasteHints: e.currentTarget.value }))}
          minRows={2}
          autosize
        />

        <Button variant="light" onClick={() => void runAi()} loading={aiBusy} fullWidth>
          AIでラベル解析
        </Button>

        <Button onClick={() => void save()} loading={busy} fullWidth>
          変更を保存
        </Button>
        <Button color="red" variant="outline" onClick={() => void remove()} fullWidth>
          削除
        </Button>
      </Stack>
    </Box>
  );
}
