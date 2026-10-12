import { Accordion, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Section } from './Section'

export function Faq() {
  if (!site.faq?.length) return null

  return (
    <Section center eyebrow="FAQ" id="faq" title="よくあるご質問">
      <Accordion maw={800} mx="auto" variant="default">
        {site.faq.map((item) => (
          <Accordion.Item key={item.q} value={item.q}>
            <Accordion.Control py="xs">
              <Text fw={600} fz={{ base: 'sm', sm: 'md' }}>
                <Text c="accent" component="span" ff={serif} fw={600} mr={12}>
                  Q
                </Text>
                {item.q}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Text c="gray.7" fz="sm" lh={1.9} pl={28}>
                {item.a}
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Section>
  )
}
