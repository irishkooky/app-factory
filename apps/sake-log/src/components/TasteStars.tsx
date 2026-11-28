import { useId } from "react";
import { Box, Stack, Text, UnstyledButton } from "@mantine/core";

const STEPS = [1, 2, 3, 4, 5] as const;

const STEP_LABEL: Record<(typeof STEPS)[number], string> = {
  1: "いまいち",
  2: "2",
  3: "3",
  4: "4",
  5: "うまい",
};

const STAR_PATH =
  "M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z";

export function TasteStars({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange: (step: number) => void;
  disabled?: boolean;
}) {
  const labelId = useId();
  return (
    <Stack gap={6}>
      <Text id={labelId} size="sm">
        おいしさ
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
          const filled = value !== null && step <= value;
          return (
            <UnstyledButton
              key={step}
              type="button"
              role="radio"
              aria-checked={value === step}
              aria-label={STEP_LABEL[step]}
              disabled={disabled}
              onClick={() => onChange(step)}
              style={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <svg width={32} height={32} viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d={STAR_PATH}
                  fill={filled ? "var(--mantine-color-yellow-6)" : "var(--mantine-color-gray-3)"}
                />
              </svg>
            </UnstyledButton>
          );
        })}
        <Text size="xs" c="dimmed" ta="center" style={{ gridColumn: "1" }}>
          いまいち
        </Text>
        <Text size="xs" c="dimmed" ta="center" style={{ gridColumn: "5" }}>
          うまい
        </Text>
      </Box>
    </Stack>
  );
}
