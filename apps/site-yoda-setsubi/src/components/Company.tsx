import { Anchor, Box, Table } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Section } from './Section'

export function Company() {
  const { company, contact, credentials } = site
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
    { label: '受付時間', value: contact.hours },
    ...credentials.map((c) => ({
      label: c === credentials[0] ? '指定' : '掲載',
      value: (
        <>
          {c.title}（{c.value}）
          <br />
          <Anchor c="var(--yd-brass-deep)" fz={12} href={c.href} rel="noopener" target="_blank">
            {c.source}
          </Anchor>
        </>
      ),
    })),
    { label: 'おもな仕事', value: site.work },
    { label: '対応エリア', value: '横浜市金沢区とその周辺' },
  ]

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(`${company.name} ${contact.address}`)}&z=15&output=embed`

  return (
    <Section id="company" kicker="会社案内" no="09" title={`${company.name}について`} tone="white">
      <Box className="yd-company-grid">
        <Table fz={{ base: 14, sm: 15 }} style={{ borderTop: '1px solid var(--yd-line)' }} verticalSpacing={14} withRowBorders>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.label} style={{ borderColor: 'var(--yd-line)' }}>
                <Table.Th c="var(--yd-sub)" fw={700} pl={0} style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }} w={{ base: 92, sm: 120 }}>
                  {row.label}
                </Table.Th>
                <Table.Td lh={1.8}>{row.value}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Box
          bg="var(--yd-paper)"
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
