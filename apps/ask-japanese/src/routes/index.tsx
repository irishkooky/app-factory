import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { Footer } from '../footer'
import { filterAnswers, TOPICS, type TopicId } from '../domain'
import { phraseFor } from '../phrases'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function Guide() {
  return (
    <svg width="128" height="168" viewBox="0 0 160 210" aria-label="Illustrated guide">
      <path d="M38 168c-6 24-4 36 8 40h68c12-4 14-16 8-40-8-6-22-10-42-10s-34 4-42 10z" fill="#1d2b4a" />
      <path d="M46 78c-8 8-12 28-8 52 2 14 8 28 8 40h68c0-12 6-26 8-40 4-24 0-44-8-52-8 10-20 14-34 14s-26-4-34-14z" fill="#24345c" />
      <path d="M58 92h44c2 10-4 16-22 16s-24-6-22-16z" fill="#f3f6fb" />
      <path d="M78 78 v28" stroke="#c4372f" strokeWidth="3" />
      <circle cx="80" cy="74" r="6" fill="#c4372f" />
      <path d="M48 150c8 8 18 10 32 10s24-2 32-10" fill="none" stroke="#1a2744" strokeWidth="2" />
      <ellipse cx="80" cy="62" rx="28" ry="32" fill="#f0c7a8" />
      <path d="M50 58c2-28 14-42 30-42 18 0 30 16 32 40-8-6-16 2-22 0-6-8-12-10-16-4-4-8-10-6-16 0-4 2-8-4-8 6z" fill="#1a120f" />
      <path d="M46 70c6 8 8 18 4 22" fill="#1a120f" />
      <path d="M114 70c-6 8-8 18-4 22" fill="#1a120f" />
      <path d="M68 64c2 3 6 3 8 0" fill="none" stroke="#1a120f" strokeWidth="2" strokeLinecap="round" />
      <path d="M86 64c2 3 6 3 8 0" fill="none" stroke="#1a120f" strokeWidth="2" strokeLinecap="round" />
      <path d="M70 78c6 7 14 7 20 0" fill="none" stroke="#9a4d3c" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 118c-16-6-22-20-16-28 6 2 10 10 16 12 4-10 14-14 18-8-8 6-10 14-8 22-4 2-8 2-10 2z" fill="#f0c7a8" />
    </svg>
  )
}

const ICONS: Record<TopicId, string> = {
  money: '¥',
  manners: '礼',
  trains: 'JR',
  food: '食',
  onsen: '湯',
  safety: '安',
}

function HomeComponent() {
  const [topic, setTopic] = useState<TopicId | 'all'>('food')
  const [openId, setOpenId] = useState<string | null>('veg')
  const [staff, setStaff] = useState(false)
  const answers = filterAnswers('', topic)
  const shown = answers.find((answer) => answer.id === openId) ?? answers[0]
  const card = shown ? phraseFor(shown.id) : null
  const lead = shown ? shown.answer.split('. ')[0]?.replace(/\.$/, '') : ''

  return (
    <Box mih="100vh" bg="#f4efe6" c="#1c140f" px="md" py="sm" style={{ display: 'flex', flexDirection: 'column' }}>
      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <Stack gap={0}>
          <Text size="xs" fw={700} c="#c4372f" style={{ letterSpacing: '0.16em' }}>
            A LOCAL, NOT A BOT
          </Text>
          <Text fz={36} fw={750} lh={0.95}>
            Ask me.
          </Text>
        </Stack>
        <Guide />
      </Group>

      {shown && card && (
        <Stack gap={8}>
          <Box maw="86%" bg="#fff" bdrs="18px 18px 18px 4px" px="sm" py={8} style={{ boxShadow: '0 6px 16px rgba(40,24,12,.06)' }}>
            <Text fw={700}>{shown.question}</Text>
          </Box>
          <Box ml="auto" maw="88%" bg="#24345c" c="#fff" bdrs="18px 18px 4px 18px" px="sm" py={8}>
            <Text>{lead}.</Text>
          </Box>
          <Box bg="#fffdf8" bd="1.5px solid #1c140f" bdrs={16} p="md" pos="relative">
            <Group justify="space-between" align="flex-start">
              <Text size="xs" fw={700} c="#c4372f" style={{ letterSpacing: '0.16em' }}>
                店員さんへ · SHOW THIS
              </Text>
              <Box w={36} h={36} bdrs={99} bd="2px solid #c4372f" style={{ display: 'grid', placeItems: 'center', transform: 'rotate(-8deg)' }}>
                <Text size="xs" c="#c4372f" fw={700}>
                  印
                </Text>
              </Box>
            </Group>
            <Text fz={32} ff="serif" lh={1.25} mt={4}>
              {card.jp}
            </Text>
            <Text mt={8} fw={650}>
              {card.romaji}
            </Text>
            <Text c="#5c5148">{card.en}</Text>
            <UnstyledButton mt="sm" w="100%" bg="#c4372f" c="#fff" fw={700} py={12} bdrs="xl" ta="center" onClick={() => setStaff(true)}>
              Show this to staff
            </UnstyledButton>
          </Box>
        </Stack>
      )}

      <Group gap={8} mt="sm">
        {TOPICS.map((item) => {
          const on = topic === item.id
          return (
            <UnstyledButton
              key={item.id}
              onClick={() => setTopic(item.id)}
              px={10}
              py={6}
              bdrs="xl"
              bg={on ? '#24345c' : '#fff'}
              c={on ? '#fff' : '#24345c'}
              bd="1.5px solid #24345c"
              fw={700}
              style={{ flex: '0 0 auto' }}
            >
              <Group gap={6} wrap="nowrap">
                <Text size="xs" ff="serif">
                  {ICONS[item.id]}
                </Text>
                {item.label}
              </Group>
            </UnstyledButton>
          )
        })}
      </Group>
      <Group gap={8} mt={8}>
        {answers
          .filter((answer) => answer.id !== shown?.id)
          .slice(0, 2)
          .map((answer) => (
            <UnstyledButton key={answer.id} onClick={() => setOpenId(answer.id)} c="#24345c" fw={700} style={{ textDecoration: 'underline' }}>
              {answer.question}
            </UnstyledButton>
          ))}
      </Group>
      <Footer current="ask-japanese" />

      {staff && card && (
        <Box
          pos="fixed"
          inset={0}
          bg="#f7f1e6"
          c="#1c140f"
          px="lg"
          style={{ zIndex: 20 }}
          onClick={() => setStaff(false)}
          role="dialog"
          aria-label="Phrase to show staff"
        >
          <Stack h="100%" justify="center" gap="lg">
            <Text size="xs" ta="center" c="#c4372f" fw={700} style={{ letterSpacing: '0.22em' }}>
              店員さんへ
            </Text>
            <Text fz={36} ff="serif" ta="center" lh={1.35} maw={320} mx="auto">
              {card.jp}
            </Text>
            <Text fz={20} ta="center" fw={650}>
              {card.romaji}
            </Text>
            <Text ta="center" c="#5c5148">
              {card.en}
            </Text>
            <Box mx="auto" w={64} h={64} bdrs={99} bd="3px solid #c4372f" style={{ display: 'grid', placeItems: 'center', transform: 'rotate(-12deg)' }}>
              <Text c="#c4372f" fw={700}>
                印
              </Text>
            </Box>
            <Text size="xs" ta="center" c="#8a8278">
              Tap anywhere to close
            </Text>
          </Stack>
        </Box>
      )}
    </Box>
  )
}
