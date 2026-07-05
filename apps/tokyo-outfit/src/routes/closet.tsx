import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  FileButton,
  Group,
  Image,
  Select,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  TextInput,
  Title,
  ColorSwatch,
} from '@mantine/core'
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  COLORS,
  COLOR_HEX,
  COLOR_LABELS,
  type Category,
  type ClothingItem,
  type ItemColor,
} from '../types'
import { addItem, compressImage, loadItems, removeItem } from '../lib/storage'

export const Route = createFileRoute('/closet')({
  component: ClosetComponent,
})

const WARMTH_MARKS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
]

const COLOR_SELECT_DATA = COLORS.map((c) => ({ value: c, label: COLOR_LABELS[c] }))

function ClosetComponent() {
  const [items, setItems] = useState<ClothingItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('tops')
  const [warmth, setWarmth] = useState(3)
  const [color, setColor] = useState<ItemColor>('white')
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined)
  const [imageProcessing, setImageProcessing] = useState(false)

  const [nameError, setNameError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setItems(loadItems())
    setLoaded(true)
  }, [])

  const handleFileChange = async (file: File | null) => {
    setSaveError(null)
    if (!file) {
      setImageDataUrl(undefined)
      return
    }
    setImageProcessing(true)
    try {
      const dataUrl = await compressImage(file)
      setImageDataUrl(dataUrl)
    } catch {
      setSaveError('画像の読み込みに失敗しました。別の画像をお試しください。')
    } finally {
      setImageProcessing(false)
    }
  }

  const resetForm = () => {
    setName('')
    setCategory('tops')
    setWarmth(3)
    setColor('white')
    setImageDataUrl(undefined)
  }

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('名前を入力してください')
      return
    }
    setNameError(null)
    setSaveError(null)

    const newItem: ClothingItem = {
      id: crypto.randomUUID(),
      name: trimmed,
      category,
      warmth,
      color,
      imageDataUrl,
      createdAt: Date.now(),
    }

    try {
      const next = addItem(newItem)
      setItems(next)
      resetForm()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  const handleRemove = (id: string) => {
    try {
      const next = removeItem(id)
      setItems(next)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  return (
    <Container size="sm" pb="xl">
      <Stack gap="lg">
        <Title order={1}>クローゼット</Title>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Title order={2} fz="lg">
              服を登録する
            </Title>

            {saveError && (
              <Alert color="red" variant="light" title="エラー">
                {saveError}
              </Alert>
            )}

            <Group align="flex-start" gap="md">
              <Stack gap={4} align="center">
                {imageDataUrl ? (
                  <Image src={imageDataUrl} h={96} w={96} fit="cover" radius="sm" alt="プレビュー" />
                ) : (
                  <Center h={96} w={96} bg="gray.1" style={{ borderRadius: 8 }}>
                    <Text fz={36}>{CATEGORY_EMOJI[category]}</Text>
                  </Center>
                )}
                <FileButton onChange={handleFileChange} accept="image/*">
                  {(props) => (
                    <Button {...props} size="xs" variant="light" loading={imageProcessing}>
                      画像を選ぶ
                    </Button>
                  )}
                </FileButton>
              </Stack>

              <Stack gap="sm" style={{ flex: 1 }}>
                <TextInput
                  label="名前"
                  placeholder="例: 白の長袖シャツ"
                  required
                  value={name}
                  error={nameError}
                  onChange={(e) => {
                    setName(e.currentTarget.value)
                    if (nameError) setNameError(null)
                  }}
                />

                <div>
                  <Text size="sm" fw={500} mb={4}>
                    カテゴリ
                  </Text>
                  <SegmentedControl
                    fullWidth
                    value={category}
                    onChange={(value) => setCategory(value as Category)}
                    data={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb={4}>
                    暖かさ（1=真夏用・涼しい 〜 5=真冬用・とても暖かい）
                  </Text>
                  <Slider min={1} max={5} step={1} value={warmth} onChange={setWarmth} marks={WARMTH_MARKS} />
                </div>

                <Select
                  label="色"
                  data={COLOR_SELECT_DATA}
                  value={color}
                  onChange={(value) => value && setColor(value as ItemColor)}
                  allowDeselect={false}
                  leftSection={<ColorSwatch color={COLOR_HEX[color]} size={16} />}
                />
              </Stack>
            </Group>

            <Button onClick={handleAdd} w="fit-content">
              追加する
            </Button>
          </Stack>
        </Card>

        <Stack gap="md">
          <Title order={2} fz="lg">
            登録済みの服
          </Title>

          {loaded && items.length === 0 && (
            <Card withBorder radius="md" padding="lg">
              <Stack align="center" gap="xs" py="md">
                <Text fz={32}>🧺</Text>
                <Text c="dimmed">まだ服が登録されていません。上のフォームから追加しましょう。</Text>
              </Stack>
            </Card>
          )}

          {CATEGORIES.map((cat) => {
            const catItems = items.filter((item) => item.category === cat)
            if (catItems.length === 0) return null
            return (
              <Stack gap="xs" key={cat}>
                <Text fw={600}>
                  {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat]}
                </Text>
                <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="sm">
                  {catItems.map((item) => (
                    <ClothingCard key={item.id} item={item} onRemove={() => handleRemove(item.id)} />
                  ))}
                </SimpleGrid>
              </Stack>
            )
          })}
        </Stack>
      </Stack>
    </Container>
  )
}

function ClothingCard({ item, onRemove }: { item: ClothingItem; onRemove: () => void }) {
  return (
    <Card withBorder padding="sm" radius="md" pos="relative">
      <Stack gap={6} align="center">
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          style={{ position: 'absolute', top: 4, right: 4 }}
          onClick={onRemove}
          aria-label="削除"
        >
          ✕
        </ActionIcon>
        {item.imageDataUrl ? (
          <Image src={item.imageDataUrl} h={96} w={96} fit="cover" radius="sm" alt={item.name} />
        ) : (
          <Center h={96} w={96} bg="gray.1" style={{ borderRadius: 8 }}>
            <Text fz={36}>{CATEGORY_EMOJI[item.category]}</Text>
          </Center>
        )}
        <Text size="sm" fw={500} ta="center" lineClamp={1}>
          {item.name}
        </Text>
        <Group gap={4}>
          <Badge size="xs" variant="light">
            {CATEGORY_LABELS[item.category]}
          </Badge>
          <Badge size="xs" color="indigo" variant="light">
            暖かさ {item.warmth}
          </Badge>
        </Group>
        <Group gap={4}>
          <ColorSwatch color={COLOR_HEX[item.color]} size={12} />
          <Text size="xs" c="dimmed">
            {COLOR_LABELS[item.color]}
          </Text>
        </Group>
      </Stack>
    </Card>
  )
}
