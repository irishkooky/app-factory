import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ActionIcon,
  Affix,
  Box,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { listSakeRecords } from "../lib/db";
import { filterSakeRecords } from "../lib/filters";
import { startLabelAnalysis, subscribeSakeChanges } from "../lib/run-analysis";
import type { RatingFilter, SakeRecord } from "../lib/types";
import { StarRating } from "../components/StarRating";

export const Route = createFileRoute("/")({
  component: GalleryPage,
});

type ThumbMap = Record<string, string>;

function GalleryPage() {
  const [records, setRecords] = useState<SakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RatingFilter>("all");
  const [query, setQuery] = useState("");
  const [thumbs, setThumbs] = useState<ThumbMap>({});

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const data = await listSakeRecords();
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return subscribeSakeChanges(() => {
      void load(true);
    });
  }, [load]);

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

  return (
    <Box mih="100dvh" pb={96} px="sm" pt="md" bg="var(--mantine-color-gray-0)">
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

        {loading ? (
          <Loader mx="auto" mt="xl" />
        ) : visible.length === 0 ? (
          <Stack align="center" gap="xs" mt="xl">
            <Text c="dimmed">まだ記録がありません</Text>
            <Text size="sm" c="dimmed">
              右下の＋からラベル写真を登録しましょう
            </Text>
          </Stack>
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

      <Affix position={{ bottom: 24, right: 20 }}>
        <ActionIcon
          component={Link}
          to="/new"
          size={58}
          radius="xl"
          variant="filled"
          color="grape"
          aria-label="新しく記録"
        >
          <Text size="xl" c="white" lh={1}>
            ＋
          </Text>
        </ActionIcon>
      </Affix>
    </Box>
  );
}
