import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  Image,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { CATEGORY_EMOJI, COLOR_LABELS, type ClothingItem, type Outfit } from '../types'
import { loadItems } from '../lib/storage'
import { fetchTodayWeather, tempToBand, weatherCodeToLabel, type TodayWeather } from '../lib/weather'
import { suggestOutfit } from '../lib/suggest'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const [items, setItems] = useState<ClothingItem[]>([])
  const [itemsLoaded, setItemsLoaded] = useState(false)
  const [weather, setWeather] = useState<TodayWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [outfit, setOutfit] = useState<Outfit | null>(null)

  // localStorage は SSR に存在しないため、マウント後にのみ読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return
    setItems(loadItems())
    setItemsLoaded(true)
  }, [])

  const loadWeather = useCallback(() => {
    setWeatherLoading(true)
    setWeatherError(null)
    fetchTodayWeather()
      .then((w) => setWeather(w))
      .catch((err: unknown) => {
        setWeatherError(err instanceof Error ? err.message : '天気情報の取得に失敗しました')
      })
      .finally(() => setWeatherLoading(false))
  }, [])

  useEffect(() => {
    loadWeather()
  }, [loadWeather])

  const band = useMemo(() => (weather ? tempToBand(weather.maxTemp) : null), [weather])

  useEffect(() => {
    if (!itemsLoaded || !band) return
    setOutfit(suggestOutfit(items, band))
  }, [itemsLoaded, band, items])

  const handleRegenerate = () => {
    if (!band) return
    setOutfit(suggestOutfit(items, band))
  }

  const weatherIcon = weather ? weatherCodeToLabel(weather.weatherCode) : null

  return (
    <Container size="sm" pb="xl">
      <Stack gap="lg">
        <Title order={1}>今日の提案</Title>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Title order={2} fz="lg">
              今日の東京の天気
            </Title>

            {weatherLoading && (
              <Stack gap="xs">
                <Skeleton height={60} />
                <Skeleton height={20} width="60%" />
              </Stack>
            )}

            {!weatherLoading && weatherError && (
              <Alert color="red" title="天気情報を取得できませんでした" variant="light">
                <Stack gap="sm">
                  <Text size="sm">{weatherError}</Text>
                  <Button variant="light" color="red" onClick={loadWeather} w="fit-content">
                    再試行
                  </Button>
                </Stack>
              </Alert>
            )}

            {!weatherLoading && !weatherError && weather && weatherIcon && (
              <Stack gap="xs">
                <Group gap="lg">
                  <Text fz={44} lh={1}>
                    {weatherIcon.emoji}
                  </Text>
                  <Stack gap={2}>
                    <Text fw={700} fz="lg">
                      {weatherIcon.label}
                    </Text>
                    <Text c="dimmed" size="sm">
                      最高 {Math.round(weather.maxTemp)}℃ ／ 最低 {Math.round(weather.minTemp)}℃
                    </Text>
                    <Text c="dimmed" size="sm">
                      降水確率 {Math.round(weather.precipProb)}%
                    </Text>
                  </Stack>
                </Group>
                {band && (
                  <Text size="sm">
                    今日は最高{Math.round(weather.maxTemp)}℃。{band.advice}
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        </Card>

        {itemsLoaded && band && outfit && (
          <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="nowrap">
                <Title order={2} fz="lg">
                  今日のコーデ提案
                </Title>
                <Button variant="light" size="sm" onClick={handleRegenerate}>
                  別の提案を見る
                </Button>
              </Group>

              {weather && weather.precipProb >= 50 && (
                <Alert color="blue" variant="light" title="傘を忘れずに ☔">
                  今日の降水確率は{Math.round(weather.precipProb)}%です。
                </Alert>
              )}

              <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="sm">
                {outfit.outer && <OutfitPieceCard item={outfit.outer} isKey={outfit.keyItem.id === outfit.outer.id} />}
                <OutfitPieceCard item={outfit.tops} isKey={outfit.keyItem.id === outfit.tops.id} />
                <OutfitPieceCard item={outfit.bottoms} isKey={outfit.keyItem.id === outfit.bottoms.id} />
                {outfit.accessory && <OutfitPieceCard item={outfit.accessory} isKey={false} />}
              </SimpleGrid>

              {band.outerNeed === 'required' && !outfit.outer && (
                <Alert color="yellow" variant="light">
                  アウターが登録されていません。クローゼットに追加すると提案の精度が上がります。
                </Alert>
              )}

              <Text size="sm" c="dimmed">
                {outfit.comment}
              </Text>
            </Stack>
          </Card>
        )}

        {itemsLoaded && band && !outfit && (
          <Card withBorder radius="md" padding="lg">
            <Stack align="center" gap="sm" py="lg">
              <Text fz={36}>🧺</Text>
              <Text fw={600}>クローゼットに服を登録しましょう</Text>
              <Text size="sm" c="dimmed" ta="center">
                提案するには、トップスとボトムスをそれぞれ1着以上登録してください。
              </Text>
              <Button component={Link} to="/closet">
                クローゼットへ
              </Button>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  )
}

function OutfitPieceCard({ item, isKey }: { item: ClothingItem; isKey: boolean }) {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6} align="center">
        {isKey && (
          <Badge color="indigo" size="sm">
            今日の一着
          </Badge>
        )}
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
        <Badge size="xs" variant="dot" color="dark">
          {COLOR_LABELS[item.color]}
        </Badge>
      </Stack>
    </Card>
  )
}
