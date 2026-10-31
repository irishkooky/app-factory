import { Anchor, Box, Table } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Section } from './Section'
import { MAP_CENTER } from '../data/area-map'

export function Company() {
  const { company, contact, profile, area } = site
  const rows = [
    { label: '屋号', value: `${company.name}（${company.kana}）` },
    { label: '所在地', value: `〒${contact.postalCode} ${contact.address}` },
    {
      label: '電話番号',
      value: (
        <Anchor c="black" fw={700} href={tel} underline="never">
          {contact.phone}
        </Anchor>
      ),
    },
    ...(contact.hours ? [{ label: '受付時間', value: contact.hours }] : []),
    ...profile,
    { label: 'おもな仕事', value: site.work },
    { label: '対応エリア', value: area.summary },
  ]

  // 地図は Googleマップの店舗ページ（place_id）を出す。住所を丁目までにしている店でも、先方が公開している位置になる
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(company.name)}&ll=${MAP_CENTER.join(',')}&z=15&output=embed`

  return (
    <Section id="company" kicker="店舗案内" title={`${company.name}について`} tone="white">
      <Box className="st-company-grid">
        <Table fz={{ base: 14, sm: 15 }} style={{ borderTop: '1px solid var(--st-line)' }} verticalSpacing={14} withRowBorders>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.label} style={{ borderColor: 'var(--st-line)' }}>
                <Table.Th c="var(--st-sub)" fw={700} pl={0} style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }} w={{ base: 92, sm: 120 }}>
                  {row.label}
                </Table.Th>
                <Table.Td lh={1.8}>{row.value}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Box
          bg="var(--st-paper)"
          component="iframe"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapSrc}
          style={{ border: 0, borderRadius: 18, height: '100%', minHeight: 380, width: '100%' }}
          title={`${company.name}の地図`}
        />
      </Box>
    </Section>
  )
}
