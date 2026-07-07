import { Badge, Box, Flex, Text, Title } from '@app-factory/ui'

export const RowBetween = () => (
  <Flex justify="space-between" align="center" p="sm" bg="indigo.0" w={420}>
    <Title order={5}>注文一覧</Title>
    <Badge color="indigo">3件</Badge>
  </Flex>
)

export const ColumnGap = () => (
  <Flex direction="column" gap="xs" w={240}>
    <Box bg="gray.1" p="xs"><Text size="sm">在庫: 東京倉庫 120個</Text></Box>
    <Box bg="gray.1" p="xs"><Text size="sm">在庫: 大阪倉庫 76個</Text></Box>
    <Box bg="gray.1" p="xs"><Text size="sm">在庫: 福岡倉庫 34個</Text></Box>
  </Flex>
)

export const WrapResponsive = () => (
  <Flex wrap="wrap" gap="sm" w={300}>
    <Box bg="indigo.1" p="sm" w={120}><Text size="sm">カード A</Text></Box>
    <Box bg="indigo.1" p="sm" w={120}><Text size="sm">カード B</Text></Box>
    <Box bg="indigo.1" p="sm" w={120}><Text size="sm">カード C</Text></Box>
  </Flex>
)
