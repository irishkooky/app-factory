import { Group, Text } from "@mantine/core";

export function StarRating({ value, size = "sm" }: { value: number; size?: "xs" | "sm" | "md" }) {
  const stars = Math.min(5, Math.max(0, Math.round(value)));
  return (
    <Group gap={2} wrap="nowrap">
      {Array.from({ length: 5 }, (_, i) => (
        <Text key={i} size={size} c={i < stars ? "yellow.6" : "gray.5"} ff="monospace" lh={1}>
          ★
        </Text>
      ))}
    </Group>
  );
}
