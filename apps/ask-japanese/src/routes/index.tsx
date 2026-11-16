import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Button, Card, Container, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { Footer } from '../footer'
import { filterAnswers, TOPICS, type TopicId } from '../domain'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const [topic, setTopic] = useState<TopicId | 'all'>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const answers = filterAnswers(query, topic)
  const shownId = answers.some((answer) => answer.id === openId) ? openId : (answers[0]?.id ?? null)

  return (
    <Box mih="100vh" bg="#f6f3ee">
      <Container size="sm" px="md" py="lg">
        <Stack gap="lg">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              From a person who lives there
            </Text>
            <Title order={1}>Ask a Japanese</Title>
            <Text>
              Practical questions Indian travelers actually ask, answered the way Yoshihiro would answer them on the spot. These are fixed answers, not a guess from a model.
            </Text>
          </Stack>

          <TextInput
            label="Search"
            size="lg"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="tipping, onsen, trains"
          />

          <Group gap="xs">
            <Button size="sm" variant={topic === 'all' ? 'filled' : 'default'} onClick={() => setTopic('all')}>
              All
            </Button>
            {TOPICS.map((item) => (
              <Button key={item.id} size="sm" variant={topic === item.id ? 'filled' : 'default'} onClick={() => setTopic(item.id)}>
                {item.label}
              </Button>
            ))}
          </Group>

          {answers.length === 0 ? (
            <Text>Nothing matches. Try onsen, train, or vegetarian.</Text>
          ) : (
            <Stack gap="sm">
              {answers.map((answer) => {
                const open = answer.id === shownId
                return (
                  <Card key={answer.id} withBorder padding="md" radius="md">
                    <Stack gap="xs">
                      <Text
                        component="button"
                        fw={600}
                        ta="left"
                        fz="lg"
                        onClick={() => setOpenId(open ? null : answer.id)}
                        aria-expanded={open}
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                      >
                        {answer.question}
                      </Text>
                      {open ? (
                        <Stack gap="xs">
                          <Text>{answer.answer}</Text>
                          <Text fw={600}>{answer.say}</Text>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Card>
                )
              })}
            </Stack>
          )}

          <Footer current="ask-japanese" />
        </Stack>
      </Container>
    </Box>
  )
}
