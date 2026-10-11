import { Box, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Img } from './Img'
import { Section } from './Section'

export function Strengths() {
  return (
    <Section eyebrow="STRENGTH" id="strengths" title={`${site.company.shortName}が選ばれる理由`}>
      <Stack gap={72}>
        {site.strengths.map((item, i) => {
          const number = (
            <Text c="accent" ff={serif} fw={500} fz={{ base: 40, sm: 56 }} lh={1} style={{ opacity: 0.9 }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
          )
          const text = (
            <Box>
              {number}
              <Title fz={{ base: 21, sm: 26 }} lh={1.6} mt="md" order={3}>
                {item.title}
              </Title>
              <Text c="gray.7" fz={{ base: 'sm', sm: 'md' }} lh={2} mt="md">
                {item.description}
              </Text>
            </Box>
          )
          if (!item.photo) return <Box key={item.title}>{text}</Box>
          return (
            <SimpleGrid cols={{ base: 1, md: 2 }} key={item.title} spacing={{ base: 'xl', md: 72 }} style={{ alignItems: 'center' }}>
              <Box style={{ order: i % 2 === 1 ? 2 : 0 }} visibleFrom="md">
                <Img photo={item.photo} ratio="3 / 2" />
              </Box>
              <Box hiddenFrom="md">
                <Img photo={item.photo} ratio="3 / 2" />
              </Box>
              {text}
            </SimpleGrid>
          )
        })}
      </Stack>
    </Section>
  )
}
