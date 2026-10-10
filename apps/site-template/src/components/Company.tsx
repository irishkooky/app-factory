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
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40}>
        <Table fz={{ base: 'sm', sm: 'md' }} verticalSpacing="md" withRowBorders>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.label}>
                <Table.Th c="gray.6" w={112}>
                  {row.label}
                </Table.Th>
                <Table.Td>{row.value}</Table.Td>
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
          style={{ aspectRatio: '4 / 3', border: 0, borderRadius: 16, width: '100%' }}
          title={`${company.shortName}の地図`}
        />
      </SimpleGrid>
    </Section>
  )
}
