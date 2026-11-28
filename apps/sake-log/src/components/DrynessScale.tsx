import { useId } from "react";
import { Box, Stack, Text, UnstyledButton } from "@mantine/core";
import type { Dryness } from "../lib/types";

const STEPS = [1, 2, 3, 4, 5] as const;

const STEP_LABEL: Record<Dryness, string> = {
  1: "甘口",
  2: "甘口と中口のあいだ",
  3: "中口",
  4: "中口と辛口のあいだ",
  5: "辛口",
};

export function DrynessScale({
  value,
  onChange,
  disabled = false,
}: {
  value: Dryness | null;
  onChange: (step: Dryness) => void;
  disabled?: boolean;
}) {
  const labelId = useId();
  return (
    <Stack gap={6}>
      <Text id={labelId} size="sm">
        甘辛
      </Text>
      <Box
        role="radiogroup"
        aria-labelledby={labelId}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          justifyItems: "center",
          rowGap: 6,
        }}
      >
        {STEPS.map((step) => {
          const selected = value === step;
          return (
            <UnstyledButton
              key={step}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={STEP_LABEL[step]}
              disabled={disabled}
              onClick={() => onChange(step)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: `2px solid ${
                  selected ? "var(--mantine-color-grape-filled)" : "var(--mantine-color-gray-4)"
                }`,
                background: selected ? "var(--mantine-color-grape-filled)" : "transparent",
                opacity: disabled ? 0.6 : 1,
              }}
            />
          );
        })}
        <Text size="xs" c="dimmed" ta="center" style={{ gridColumn: "1" }}>
          甘口
        </Text>
        <Text size="xs" c="dimmed" ta="center" style={{ gridColumn: "3" }}>
          中口
        </Text>
        <Text size="xs" c="dimmed" ta="center" style={{ gridColumn: "5" }}>
          辛口
        </Text>
      </Box>
    </Stack>
  );
}
