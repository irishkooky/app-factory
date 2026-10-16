import { Box, SimpleGrid, Table } from '@mantine/core'
import { site } from '../site.config'
import { Section } from './Section'

export function Company() {
  const { company, contact } = site
  const rows = [
    { label: '会社名', value: company.name },
    company.representative && { label: '代表者', value: company.representative },
    company.founded && { label: '創業', value: company.founded },
    { label: '所在地', value: `${contact.postalCode ? `〒${contact.postalCode} ` : ''}${contact.address}` },
    { label: '電話番号', value: contact.phone },
    { label: '営業時間', value: `${contact.hours}${contact.holidays ? `（定休日: ${contact.holidays}）` : ''}` },
    ...(company.extraRows ?? []),
  ].filter((row): row is { label: string; value: string } => Boolean(row))

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(contact.mapQuery ?? contact.address)}&z=15&output=embed`

  return (
    <Section eyebrow="COMPANY" id="company" title="会社概要・アクセス">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 40, md: 64 }}>
        <Table
          fz={{ base: 'sm', sm: 'md' }}
          verticalSpacing="md"
          withRowBorders
          style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}
        >
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.label}>
                <Table.Th c="gray.6" fw={500} w={{ base: 96, sm: 128 }} style={{ verticalAlign: 'top' }}>
                  {row.label}
                </Table.Th>
                <Table.Td lh={1.8}>{row.value}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Box
          bg="gray.1"
          component="iframe"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapSrc}
          style={{ border: 0, borderRadius: 4, minHeight: 360, height: '100%', width: '100%' }}
          title={`${company.shortName}の地図`}
        />
      </SimpleGrid>
    </Section>
  )
}
