import { Paper, SimpleGrid, Text } from '@app-factory/ui'

export const TwoColumns = () => (
  <SimpleGrid cols={2} w={360}>
    <Paper withBorder p="sm"><Text size="sm" ta="center">田中太郎</Text></Paper>
    <Paper withBorder p="sm"><Text size="sm" ta="center">佐藤花子</Text></Paper>
    <Paper withBorder p="sm"><Text size="sm" ta="center">鈴木一郎</Text></Paper>
    <Paper withBorder p="sm"><Text size="sm" ta="center">高橋美咲</Text></Paper>
  </SimpleGrid>
)

export const ThreeColumns = () => (
  <SimpleGrid cols={3} spacing="xs" w={360}>
    <Paper withBorder p="xs"><Text size="xs" ta="center">1月</Text></Paper>
    <Paper withBorder p="xs"><Text size="xs" ta="center">2月</Text></Paper>
    <Paper withBorder p="xs"><Text size="xs" ta="center">3月</Text></Paper>
    <Paper withBorder p="xs"><Text size="xs" ta="center">4月</Text></Paper>
    <Paper withBorder p="xs"><Text size="xs" ta="center">5月</Text></Paper>
    <Paper withBorder p="xs"><Text size="xs" ta="center">6月</Text></Paper>
  </SimpleGrid>
)
