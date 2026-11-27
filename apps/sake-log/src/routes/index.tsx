import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ActionIcon,
  Affix,
  Box,
  Drawer,
  Group,
  Image,
  Loader,
  Rating,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import {
  freshCaptureVisible,
  isSheetOpen,
  shotOf,
  stepCapture,
  type CaptureEvent,
  type CaptureSession,
} from "../lib/capture-session";
import { createSakeRecord, listSakeRecords } from "../lib/db";
import { filterSakeRecords } from "../lib/filters";
import { prepareSakeImages, type PreparedSakeImages } from "../lib/image";
import { startLabelAnalysis, subscribeSakeChanges } from "../lib/run-analysis";
import type { RatingFilter, SakeRecord } from "../lib/types";
import { StarRating } from "../components/StarRating";

export const Route = createFileRoute("/")({
  component: GalleryPage,
});

type ThumbMap = Record<string, string>;

// Drawer は中身の枠に height: 100vh を渡す。渡された高さを捨てて、写真と★の高さにする。
function CaptureSheetFrame({
  style,
  children,
  ...props
}: {
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div {...props} style={{ ...style, height: "auto" }}>
      {children}
    </div>
  );
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function releaseReplacedPreview(
  previous: PreparedSakeImages | null,
  next: PreparedSakeImages | null,
) {
  if (previous && previous !== next) URL.revokeObjectURL(previous.previewUrl);
}

function GalleryPage() {
  const sessionRef = useRef<CaptureSession<PreparedSakeImages>>({ phase: "idle" });
  const [session, setSession] = useState(sessionRef.current);
  const [records, setRecords] = useState<SakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RatingFilter>("all");
  const [query, setQuery] = useState("");
  const [thumbs, setThumbs] = useState<ThumbMap>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef(filter);
  const queryRef = useRef(query);
  filterRef.current = filter;
  queryRef.current = query;

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const data = await listSakeRecords();
    setRecords(data);
    setLoading(false);
  }, []);

  const dispatch = useCallback((event: CaptureEvent<PreparedSakeImages>) => {
    const next = stepCapture(sessionRef.current, event);
    releaseReplacedPreview(shotOf(sessionRef.current), shotOf(next));
    sessionRef.current = next;
    setSession((current) => (current === next ? current : next));
    return next;
  }, []);

  useEffect(() => {
    void load();
    return subscribeSakeChanges(() => {
      void load(true);
    });
  }, [load]);

  useEffect(() => {
    const ref = sessionRef;
    return () => {
      const current = shotOf(ref.current);
      if (current) URL.revokeObjectURL(current.previewUrl);
    };
  }, []);

  useEffect(() => {
    for (const record of records) {
      if (record.analysisStatus === "pending") void startLabelAnalysis(record.id);
    }
  }, [records]);

  useEffect(() => {
    const next: ThumbMap = {};
    for (const record of records) {
      next[record.id] = URL.createObjectURL(record.thumb);
    }
    setThumbs(next);
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
  }, [records]);

  const visible = useMemo(
    () => filterSakeRecords(records, { filter, query }),
    [records, filter, query],
  );

  async function saveShot(shot: PreparedSakeImages, rating: number) {
    try {
      const record = await createSakeRecord({
        rating,
        memo: "",
        image: shot.image,
        thumb: shot.thumb,
        imageMime: shot.imageMime,
        thumbMime: shot.thumbMime,
      });
      void startLabelAnalysis(record.id);
      if (!freshCaptureVisible(rating, filterRef.current, queryRef.current)) {
        setFilter("all");
        setQuery("");
      }
      await load(true);
      dispatch({ type: "saved" });
    } catch (err) {
      dispatch({ type: "save-failed", message: errorText(err) });
    }
  }

  function onRate(value: number) {
    const before = sessionRef.current;
    const next = dispatch({ type: "rate", rating: value });
    if (before.phase === "saving" || next.phase !== "saving") return;
    void saveShot(next.shot, next.rating);
  }

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0] ?? null;
    input.value = "";
    if (!file) return;

    let before = sessionRef.current;
    if (before.phase === "failed" && before.shot === null) {
      before = dispatch({ type: "dismiss" });
    }
    const picked = dispatch({ type: "pick" });
    if (before.phase !== "idle" || picked.phase !== "preparing") return;

    try {
      const shot = await prepareSakeImages(file);
      const reviewed = dispatch({ type: "ready", shot });
      if (shotOf(reviewed) !== shot) URL.revokeObjectURL(shot.previewUrl);
    } catch (err) {
      dispatch({ type: "prepare-failed", message: errorText(err) });
    }
  }

  const shot = shotOf(session);

  return (
    <Box mih="100dvh" pb={96} px="sm" pt="md" bg="var(--mantine-color-gray-0)">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        onChange={(event) => void onPhoto(event)}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <Stack gap="md">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>日本酒ログ</Title>
            <Text size="sm" c="dimmed">
              飲んだ銘柄を写真で残し、次の一杯の参考に
            </Text>
          </div>
          <Text size="sm" c="dimmed">
            {visible.length} 件
          </Text>
        </Group>

        <TextInput
          placeholder="銘柄・酒蔵で検索"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          radius="md"
        />

        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as RatingFilter)}
          data={[
            { label: "すべて", value: "all" },
            { label: "★4以上", value: "4plus" },
            { label: "★3以上", value: "3plus" },
            { label: "★5のみ", value: "5only" },
          ]}
          fullWidth
        />

        {session.phase === "failed" && session.shot === null ? (
          <Text c="red" size="sm" ta="center">
            {session.message}
          </Text>
        ) : null}

        {loading ? (
          <Loader mx="auto" mt="xl" />
        ) : visible.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">
            まだ記録がありません。右下の＋で写真を撮って記録できます
          </Text>
        ) : (
          <SimpleGrid cols={3} spacing={4}>
            {visible.map((record) => (
              <Link
                key={record.id}
                to="/entry/$entryId"
                params={{ entryId: record.id }}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Box
                  pos="relative"
                  style={{ aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 6 }}
                >
                  {thumbs[record.id] ? (
                    <img
                      src={thumbs[record.id]}
                      alt={record.label.brandName || "日本酒ラベル"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <Box bg="gray.3" w="100%" h="100%" />
                  )}
                  <Box
                    pos="absolute"
                    left={4}
                    right={4}
                    bottom={4}
                    px={6}
                    py={4}
                    style={{
                      background: "rgba(0,0,0,0.45)",
                      borderRadius: 6,
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <StarRating value={record.rating} size="xs" />
                    <Text size="xs" c="white" lineClamp={1} mt={2}>
                      {record.analysisStatus === "pending"
                        ? "AI解析中…"
                        : record.label.brandName ||
                          (record.analysisStatus === "failed" ? "解析失敗" : "銘柄未設定")}
                    </Text>
                  </Box>
                </Box>
              </Link>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <Drawer
        opened={isSheetOpen(session)}
        onClose={() => dispatch({ type: "dismiss" })}
        position="bottom"
        scrollAreaComponent={CaptureSheetFrame}
        withCloseButton
        closeButtonProps={{ "aria-label": "閉じる" }}
        title={<VisuallyHidden>評価</VisuallyHidden>}
        styles={{ content: { height: "auto", borderRadius: "16px 16px 0 0" } }}
      >
        <Stack gap="md" pb="sm">
          {shot ? (
            <Image src={shot.previewUrl} alt="ラベル写真" fit="contain" mah={240} w="100%" />
          ) : null}
          <Group justify="center">
            <Rating
              size="xl"
              count={5}
              value={session.phase === "saving" ? session.rating : 0}
              readOnly={session.phase === "saving"}
              onChange={(value) => onRate(value ?? 0)}
            />
          </Group>
          {session.phase === "failed" && session.shot !== null ? (
            <Text c="red" size="sm" ta="center">
              {session.message}
            </Text>
          ) : null}
        </Stack>
      </Drawer>

      {isSheetOpen(session) ? null : (
        <Affix position={{ bottom: 24, right: 20 }}>
          <ActionIcon
            size={58}
            radius="xl"
            variant="filled"
            color="grape"
            aria-label="写真を撮る"
            loading={session.phase === "preparing"}
            onClick={() => inputRef.current?.click()}
          >
            <Text size="xl" c="white" lh={1}>
              ＋
            </Text>
          </ActionIcon>
        </Affix>
      )}
    </Box>
  );
}
