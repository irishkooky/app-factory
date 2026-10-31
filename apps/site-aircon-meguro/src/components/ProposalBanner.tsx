import { Box, Text } from '@mantine/core'
import { site } from '../site.config'

export function ProposalBanner() {
  return (
    <Box bg="var(--st-deepest)" px="md" py={7}>
      <Text c="rgba(255,255,255,0.72)" fz={{ base: 11, sm: 12 }} lh={1.6} ta="center">
        このページは{site.company.name}様へのご提案用に{site.site.proposedBy}が作成したサンプルです。掲載内容は公開情報をもとにしています。
      </Text>
    </Box>
  )
}
