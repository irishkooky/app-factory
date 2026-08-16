import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Anchor,
  Badge,
  Box,
  Button,
  CloseButton,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core'
import { AppCard } from '../components/AppCard'
import { StatBlock } from '../components/StatBlock'
import { CATALOG, CATEGORY_COUNTS, TOTAL_COUNT, ACTIVE_CATEGORY_COUNT, type CatalogItem } from '../data/catalog'
import { CATEGORY_LABELS, CATEGORY_ORDER, type Category } from '../data/meta'
import { checkLiveness } from '../server/liveness'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

type CategoryFilter = 'all' | Category
type LiveStatus = 'up' | 'down'

const GITHUB_URL = 'https://github.com/irishkooky/app-factory'

/** 検索語の前後空白をtrimし、空白区切りをAND条件のトークン配列にする */
function toSearchTokens(raw: string): string[] {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)
}

function buildHaystack(item: CatalogItem): string {
  return [item.title, item.description, item.tags.join(' '), item.slug].join(' ').toLowerCase()
}

function matchesTokens(item: CatalogItem, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  const haystack = buildHaystack(item)
  return tokens.every((token) => haystack.includes(token))
}

function HomeComponent() {
  const [searchValue, setSearchValue] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [live, setLive] = useState<Record<string, LiveStatus>>({})
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    checkLiveness()
      .then((r) => {
        if (!cancelled) {
          setLive(r.results)
          setChecked(true)
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const searchTokens = useMemo(() => toSearchTokens(searchValue), [searchValue])

  const searchFiltered = useMemo(
    () => CATALOG.filter((item) => matchesTokens(item, searchTokens)),
    [searchTokens],
  )

  const tabCounts = useMemo(() => {
    const counts: Record<Category, number> = { tool: 0, game: 0, demo: 0 }
    for (const item of searchFiltered) {
      counts[item.category] += 1
    }
    return counts
  }, [searchFiltered])

  const visible = useMemo(
    () => (category === 'all' ? searchFiltered : searchFiltered.filter((item) => item.category === category)),
    [searchFiltered, category],
  )

  const checkedCount = Object.keys(live).length
  const upCount = Object.values(live).filter((s) => s === 'up').length

  let liveValue: string
  let liveColor: string | undefined
  if (!checked) {
    liveValue = 'CHECKING'
    liveColor = 'var(--mantine-color-gray-5)'
  } else if (checkedCount > 0 && upCount === checkedCount) {
    liveValue = 'ALL LIVE'
    liveColor = 'var(--mantine-color-green-6)'
  } else {
    liveValue = `${upCount}/${checkedCount} LIVE`
    liveColor = 'var(--mantine-color-orange-6)'
  }

  return (
    <Box>
      <Box style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Container size="xl">
          <Group justify="space-between" py="md" wrap="nowrap">
            <Text ff="monospace" fz={22} fw={700} style={{ letterSpacing: '.12em' }}>
              <Text component="span" c="black" inherit>
                APP{' '}
              </Text>
              <Text component="span" c="indigo" inherit>
                FACTORY
              </Text>
            </Text>
            <Anchor href={GITHUB_URL} target="_blank" rel="noreferrer" size="sm" c="dimmed">
              GitHub
            </Anchor>
          </Group>
        </Container>
      </Box>

      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Text fz={20} fw={500}>
            AIと一緒に作ったWebツール・ゲーム・デモを、全部ここに並べています。
          </Text>

          <Group gap={48}>
            <StatBlock value={TOTAL_COUNT} label="作品数" />
            <StatBlock value={ACTIVE_CATEGORY_COUNT} label="カテゴリ数" />
            <StatBlock value={liveValue} label="稼働状況" valueColor={liveColor} />
          </Group>

          <TextInput
            placeholder="作品名・タグで検索"
            size="md"
            radius="xl"
            maw={520}
            value={searchValue}
            onChange={(e) => setSearchValue(e.currentTarget.value)}
            rightSection={
              searchValue.length > 0 ? <CloseButton onClick={() => setSearchValue('')} aria-label="検索語をクリア" /> : null
            }
          />

          <Tabs value={category} onChange={(value) => setCategory((value as CategoryFilter) ?? 'all')} variant="default">
            <Tabs.List>
              <Tabs.Tab
                value="all"
                rightSection={
                  <Badge size="sm" variant="light" color="gray" circle>
                    {searchFiltered.length}
                  </Badge>
                }
              >
                すべて
              </Tabs.Tab>
              {CATEGORY_ORDER.map((cat) => (
                <Tabs.Tab
                  key={cat}
                  value={cat}
                  rightSection={
                    <Badge size="sm" variant="light" color="gray" circle>
                      {tabCounts[cat]}
                    </Badge>
                  }
                >
                  {CATEGORY_LABELS[cat]}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          {visible.length === 0 ? (
            <Stack align="center" gap="sm" py={60}>
              <Text c="dimmed">該当する作品がありません。</Text>
              {searchValue.length > 0 && (
                <Button variant="light" onClick={() => setSearchValue('')}>
                  検索語を消す
                </Button>
              )}
            </Stack>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {visible.map((item) => (
                <AppCard key={item.slug} item={item} status={live[item.slug] ?? 'unknown'} />
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
