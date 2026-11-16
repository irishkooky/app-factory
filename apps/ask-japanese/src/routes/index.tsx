import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Group, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { Footer } from '../footer'
import { filterAnswers, TOPICS, type TopicId } from '../domain'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const [topic, setTopic] = useState<TopicId | 'all'>('food')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>('veg')
  const answers = filterAnswers(query, topic)
  const shown = answers.find((answer) => answer.id === openId) ?? answers[0]

  return (
    <Box mih="100vh" bg="#fff8f3" c="#1a120f" px="md" py="lg">
      <Stack gap="sm" maw={420} mx="auto">
        <Text size="xs" tt="uppercase" fw={700} c="#b42318" style={{ letterSpacing: '0.16em' }}>
          A person in Tokyo
        </Text>
        <Text fz={36} fw={750} lh={0.95}>
          Ask a Japanese.
        </Text>
        {shown ? (
          <Box bg="#fff" bd="1.5px solid #1a120f" bdrs={22} p="md">
            <Text fz={28} fw={750} lh={1.05}>
              {shown.question}
            </Text>
            <Text mt={8} fw={600}>
              {shown.answer.split('. ')[0]?.replace(/\.$/, '')}.
            </Text>
            <Text fz={26} ff="serif" mt="sm" lh={1.25} c="#9d1c28">
              {shown.say}
            </Text>
          </Box>
        ) : (
          <Text>Nothing matches. Try onsen or train.</Text>
        )}
        <Group gap={8}>
          {TOPICS.map((item) => (
            <UnstyledButton
              key={item.id}
              onClick={() => setTopic(item.id)}
              px="sm"
              py={8}
              bdrs="xl"
              bg={topic === item.id ? '#1a120f' : '#fff'}
              c={topic === item.id ? '#fff' : '#1a120f'}
              bd="1.5px solid #1a120f"
              fw={700}
            >
              {item.label}
            </UnstyledButton>
          ))}
        </Group>
        <TextInput
          aria-label="Search"
          placeholder="tip, onsen, train"
          radius="xl"
          size="md"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />

        {answers.filter((answer) => answer.id !== shown?.id).slice(0, 4).map((answer) => (
          <UnstyledButton
            key={answer.id}
            onClick={() => setOpenId(answer.id)}
            bg="#f3ebe3"
            bdrs="lg"
            px="md"
            py="sm"
            fw={700}
            ta="left"
          >
            {answer.question}
          </UnstyledButton>
        ))}
        <Footer current="ask-japanese" />
      </Stack>
    </Box>
  )
}
