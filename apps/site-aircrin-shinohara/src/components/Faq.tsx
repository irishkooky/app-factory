import { Accordion, Text } from '@mantine/core'
import { display } from '../theme'
import { site } from '../site.config'
import { Section } from './Section'

export function Faq() {
  return (
    <Section id="faq" kicker="よくあるご質問" title="お電話の前に。">
      <Accordion chevronPosition="right" className="st-faq" maw={880} variant="default">
        {site.faq.map((item) => (
          <Accordion.Item key={item.q} value={item.q}>
            <Accordion.Control px={0} py={10}>
              <Text fw={700} fz={{ base: 15, sm: 17 }} lh={1.6} style={{ display: 'flex', gap: 14 }}>
                <Text c="var(--st-accent-deep)" component="span" ff={display} fw={800} fz={18}>
                  Q
                </Text>
                {item.q}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Text c="var(--st-sub)" className="st-phrase" fz={{ base: 15, sm: 16 }} lh={1.95} pb={8} pl={30}>
                {item.a}
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Section>
  )
}
