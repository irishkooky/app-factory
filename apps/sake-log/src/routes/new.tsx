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
  Title,
} from "@mantine/core";
import { createSakeRecord } from "../lib/db";
import { prepareSakeImages } from "../lib/image";
import { startLabelAnalysis } from "../lib/run-analysis";

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
  const [rating, setRating] = useState(0);
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
    if (!image || !thumb || rating < 1) return;
    setBusy(true);
    setError(null);
    try {
      const record = await createSakeRecord({
        rating,
        memo: "",
        image,
        thumb,
        imageMime,
        thumbMime,
      });
      void startLabelAnalysis(record.id);
      await navigate({ to: "/" });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Box mih="100dvh" px="md" py="md" maw={480} mx="auto">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={3}>記録する</Title>
          <Button component={Link} to="/" variant="subtle" size="compact-sm">
            一覧へ
          </Button>
        </Group>

        {error ? (
          <Alert color="red" title="保存できませんでした">
            {error}
          </Alert>
        ) : null}

        <FileButton onChange={(file) => void onSelect(file)} accept="image/*" capture="environment">
          {(props) => (
            <Button {...props} variant="light" loading={busy && !image} fullWidth size="md">
              写真を撮る / 選ぶ
            </Button>
          )}
        </FileButton>

        {preview ? (
          <Image src={preview} alt="ラベル写真" radius="md" fit="contain" mah={360} />
        ) : (
          <Box
            h={220}
            bg="gray.1"
            style={{ borderRadius: 12, border: "1px dashed var(--mantine-color-gray-4)" }}
          />
        )}

        <Stack gap={6} align="center">
          <Text size="sm" fw={600}>
            評価
          </Text>
          <Rating value={rating} onChange={(value) => setRating(value ?? 0)} size="xl" />
        </Stack>

        <Button
          onClick={() => void save()}
          loading={busy && !!image}
          disabled={!image || rating < 1}
          fullWidth
          size="md"
        >
          保存
        </Button>
      </Stack>
    </Box>
  );
}
