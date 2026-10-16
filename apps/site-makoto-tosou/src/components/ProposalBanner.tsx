import { Box, Text } from '@mantine/core'
import { site } from '../site.config'

export function ProposalBanner() {
  return (
    <Box bg="dark.8" px="md" py={8}>
      <Text c="gray.1" fz={{ base: 'xs', sm: 'sm' }} ta="center">
        このページは{site.company.name}様へのご提案用に{site.site.proposedBy}
        が作成したサンプルです。掲載内容は公開情報をもとにした仮のものです。
      </Text>
    </Box>
  )
}
