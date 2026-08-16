import { Badge, Box, Card, Group, Text } from '@mantine/core'
import type { CatalogItem } from '../data/catalog'
import type { Category } from '../data/meta'
import classes from './AppCard.module.css'

type Props = {
  item: CatalogItem
  status: 'up' | 'down' | 'unknown'
}

const STATUS_COLOR: Record<Props['status'], string> = {
  up: 'var(--mantine-color-green-6)',
  down: 'var(--mantine-color-red-6)',
  unknown: 'var(--mantine-color-gray-4)',
}

const STATUS_LABEL: Record<Props['status'], string> = {
  up: '稼働中',
  down: '停止中',
  unknown: '確認中',
}

const CATEGORY_GRADIENT: Record<Category, string> = {
  tool: 'linear-gradient(135deg, var(--mantine-color-indigo-4), var(--mantine-color-indigo-8))',
  game: 'linear-gradient(135deg, var(--mantine-color-orange-4), var(--mantine-color-orange-8))',
  demo: 'linear-gradient(135deg, var(--mantine-color-teal-4), var(--mantine-color-teal-8))',
}

function formatNo(no: number): string {
  return `No.${String(no).padStart(3, '0')}`
}

export function AppCard({ item, status }: Props) {
  const body = (
    <>
      <Box style={{ aspectRatio: '16 / 10', overflow: 'hidden', background: '#eceae4' }}>
        {item.shotUrl ? (
          <img
            src={item.shotUrl}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
          />
        ) : (
          <div className={classes.fallbackThumb} style={{ background: CATEGORY_GRADIENT[item.category] }}>
            <span className={classes.fallbackLetter}>{item.title.charAt(0)}</span>
          </div>
        )}
      </Box>

      <Box p="lg">
        <Group justify="space-between" gap={8} wrap="nowrap">
          <Text ff="monospace" size="sm" c="dimmed">
            {formatNo(item.no)}
          </Text>
          <Group gap={6} wrap="nowrap">
            {!item.deployed && (
              <Badge size="xs" color="gray">
                未デプロイ
              </Badge>
            )}
            <Box
              w={8}
              h={8}
              title={STATUS_LABEL[status]}
              style={{ borderRadius: '50%', background: STATUS_COLOR[status], flexShrink: 0 }}
            />
          </Group>
        </Group>

        <Text fw={700} fz="lg" mt={4} lineClamp={2}>
          {item.title}
        </Text>

        <Text size="sm" c="dimmed" mt="xs" lineClamp={3}>
          {item.description}
        </Text>

        {item.tags.length > 0 && (
          <Group gap={6} mt="md">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="light" color="gray" size="sm" tt="none">
                {tag}
              </Badge>
            ))}
          </Group>
        )}
      </Box>
    </>
  )

  if (!item.deployed) {
    return (
      <Card withBorder radius="lg" padding={0} className={classes.card} style={{ overflow: 'hidden', opacity: 0.55 }}>
        {body}
      </Card>
    )
  }

  return (
    <Card
      component="a"
      href={item.url}
      target="_blank"
      rel="noreferrer"
      withBorder
      radius="lg"
      padding={0}
      className={classes.card}
      style={{ overflow: 'hidden' }}
    >
      {body}
    </Card>
  )
}
