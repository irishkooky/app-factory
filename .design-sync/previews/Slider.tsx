import { Stack, Text, Slider } from '@app-factory/ui'

export const Basic = () => (
  <Stack gap={40} maw={320} pb="md">
    <Slider defaultValue={40} />
  </Stack>
)

export const WithMarks = () => (
  <Stack gap={40} maw={320} pb="xl">
    <Text size="sm">配送希望時間</Text>
    <Slider
      defaultValue={2}
      min={0}
      max={3}
      step={1}
      marks={[
        { value: 0, label: '午前' },
        { value: 1, label: '12-14時' },
        { value: 2, label: '14-16時' },
        { value: 3, label: '18-20時' },
      ]}
      restrictToMarks
    />
  </Stack>
)

export const LabelAlwaysOnWithColor = () => (
  <Stack gap={40} maw={320} pb="md">
    <Slider
      defaultValue={70}
      color="grape"
      labelAlwaysOn
      label={(value) => `${value}%`}
    />
  </Stack>
)

export const Sizes = () => (
  <Stack gap={40} maw={320} pb="md">
    <Slider defaultValue={20} size="xs" />
    <Slider defaultValue={50} size="md" />
    <Slider defaultValue={80} size="xl" />
  </Stack>
)

export const Disabled = () => (
  <Stack gap={40} maw={320} pb="md">
    <Slider defaultValue={30} disabled />
  </Stack>
)
