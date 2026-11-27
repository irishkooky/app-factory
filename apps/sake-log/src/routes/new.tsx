import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Alert,
  Box,
  Button,
  FileButton,
  Group,
  Image,
  Rating,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { createSakeRecord } from "../lib/db";
import { prepareSakeImages } from "../lib/image";

export const Route = createFileRoute("/new")({
  component: NewEntryPage,
});

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function NewEntryPage() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [image, setImage] = useState<Blob | null>(null);
  const [thumb, setThumb] = useState<Blob | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [thumbMime, setThumbMime] = useState<string>("image/jpeg");
  const [rating, setRating] = useState(3);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSelect(file: File | null) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepareSakeImages(file);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(prepared.previewUrl);
      setImage(prepared.image);
      setThumb(prepared.thumb);
      setImageMime(prepared.imageMime);
      setThumbMime(prepared.thumbMime);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!image || !thumb) {
      setError("先にラベル写真を選んでください");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const record = await createSakeRecord({
        rating,
        memo,
        image,
        thumb,
        imageMime,
        thumbMime,
      });
      await navigate({ to: "/entry/$entryId", params: { entryId: record.id } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box mih="100dvh" px="md" py="md" maw={480} mx="auto">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>記録を追加</Title>
          <Button component={Link} to="/" variant="subtle" size="compact-sm">
            一覧へ
          </Button>
        </Group>

        {error ? (
          <Alert color="red" title="エラー">
            {error}
          </Alert>
        ) : null}

        <FileButton onChange={(file) => void onSelect(file)} accept="image/*" capture="environment">
          {(props) => (
            <Button {...props} variant="light" loading={busy} fullWidth>
              カメラで撮る / 写真を選ぶ
            </Button>
          )}
        </FileButton>
        <Text size="xs" c="dimmed">
          iOS では「写真ライブラリ」からも選べます
        </Text>

        {preview ? (
          <Image src={preview} alt="プレビュー" radius="md" fit="contain" mah={360} />
        ) : (
          <Box
            h={200}
            bg="gray.1"
            style={{ borderRadius: 12, border: "1px dashed var(--mantine-color-gray-4)" }}
          />
        )}

        <Stack gap={4}>
          <Text size="sm" fw={600}>
            評価
          </Text>
          <Rating value={rating} onChange={(v) => setRating(v ?? 3)} size="lg" />
        </Stack>

        <Textarea
          label="ひとことメモ（任意）"
          placeholder="香り・温度・食中酒など"
          value={memo}
          onChange={(e) => setMemo(e.currentTarget.value)}
          minRows={3}
          autosize
        />

        <Button onClick={() => void save()} loading={busy} disabled={!image} fullWidth size="md">
          保存する
        </Button>
      </Stack>
    </Box>
  );
}
