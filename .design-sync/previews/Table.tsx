import { Badge, Table } from '@app-factory/ui'

const deploys = [
  { version: 'v1.4.2', app: 'weather-dash', status: '成功', env: '本番', at: '2026-07-06 09:12', by: '黒崎' },
  { version: 'v1.4.1', app: 'weather-dash', status: '成功', env: 'ステージング', at: '2026-07-05 18:40', by: '黒崎' },
  { version: 'v1.4.0', app: 'weather-dash', status: '失敗', env: '本番', at: '2026-07-05 14:03', by: 'CI' },
  { version: 'v1.3.9', app: 'weather-dash', status: '成功', env: '本番', at: '2026-07-04 11:27', by: '田中' },
  { version: 'v1.3.8', app: 'weather-dash', status: '進行中', env: 'ステージング', at: '2026-07-04 10:58', by: 'CI' },
]

const statusColor: Record<string, string> = {
  成功: 'teal',
  失敗: 'red',
  進行中: 'yellow',
}

export const Basic = () => (
  <Table striped highlightOnHover withTableBorder withColumnBorders>
    <Table.Thead>
      <Table.Tr>
        <Table.Th>バージョン</Table.Th>
        <Table.Th>アプリ</Table.Th>
        <Table.Th>環境</Table.Th>
        <Table.Th>ステータス</Table.Th>
        <Table.Th>デプロイ日時</Table.Th>
        <Table.Th>担当者</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {deploys.map((row) => (
        <Table.Tr key={row.version}>
          <Table.Td>{row.version}</Table.Td>
          <Table.Td>{row.app}</Table.Td>
          <Table.Td>{row.env}</Table.Td>
          <Table.Td>
            <Badge color={statusColor[row.status]} variant="light">
              {row.status}
            </Badge>
          </Table.Td>
          <Table.Td>{row.at}</Table.Td>
          <Table.Td>{row.by}</Table.Td>
        </Table.Tr>
      ))}
    </Table.Tbody>
  </Table>
)

export const Compact = () => (
  <Table verticalSpacing="xs" horizontalSpacing="sm" withRowBorders={false}>
    <Table.Thead>
      <Table.Tr>
        <Table.Th>バージョン</Table.Th>
        <Table.Th>ステータス</Table.Th>
        <Table.Th>デプロイ日時</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {deploys.slice(0, 4).map((row) => (
        <Table.Tr key={row.version}>
          <Table.Td>{row.version}</Table.Td>
          <Table.Td>
            <Badge color={statusColor[row.status]} variant="dot">
              {row.status}
            </Badge>
          </Table.Td>
          <Table.Td>{row.at}</Table.Td>
        </Table.Tr>
      ))}
    </Table.Tbody>
  </Table>
)
