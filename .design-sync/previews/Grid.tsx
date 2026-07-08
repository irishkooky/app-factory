import { Grid, Paper, Text, Title } from '@app-factory/ui'

export const Basic = () => (
  <Grid w={480}>
    <Grid.Col span={6}>
      <Paper withBorder p="sm">
        <Text size="sm">売上</Text>
        <Title order={4}>¥1,204,000</Title>
      </Paper>
    </Grid.Col>
    <Grid.Col span={6}>
      <Paper withBorder p="sm">
        <Text size="sm">注文数</Text>
        <Title order={4}>328件</Title>
      </Paper>
    </Grid.Col>
  </Grid>
)

export const ThreeColumn = () => (
  <Grid w={480}>
    <Grid.Col span={4}>
      <Paper withBorder p="sm"><Text size="sm" ta="center">在庫</Text></Paper>
    </Grid.Col>
    <Grid.Col span={4}>
      <Paper withBorder p="sm"><Text size="sm" ta="center">配送</Text></Paper>
    </Grid.Col>
    <Grid.Col span={4}>
      <Paper withBorder p="sm"><Text size="sm" ta="center">返品</Text></Paper>
    </Grid.Col>
  </Grid>
)

export const AsymmetricSpans = () => (
  <Grid w={480}>
    <Grid.Col span={8}>
      <Paper withBorder p="sm" h={80}>
        <Text size="sm">メインコンテンツ (span=8)</Text>
      </Paper>
    </Grid.Col>
    <Grid.Col span={4}>
      <Paper withBorder p="sm" h={80}>
        <Text size="sm">サイドバー (span=4)</Text>
      </Paper>
    </Grid.Col>
  </Grid>
)
