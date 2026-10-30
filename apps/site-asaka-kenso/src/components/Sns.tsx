import { Badge, Box, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { Icon } from './Icon'
import { Section } from './Section'

export function Sns() {
  const sns = site.sns
  if (!sns) return null
  const instagramUrl = sns.instagram && `https://www.instagram.com/${sns.instagram}/`

  return (
    <Section center eyebrow="SNS" id="sns" lead="現場のようすや塗装の豆知識を発信しています。" soft title="最新の投稿">
      <Stack gap={48} maw={600} mx="auto">
        {sns.instagram && instagramUrl && (
          <Box>
            <Group gap={8} justify="center" mb="md">
              <Icon name="instagram" size={22} />
              <Text fw={700}>Instagram</Text>
              <Text c="gray.6" fz="sm">
                @{sns.instagram}
              </Text>
            </Group>
            <Box className="ig-frame">
              <iframe
                loading="lazy"
                scrolling="no"
                src={`${instagramUrl}embed/?hl=ja`}
                title={`${site.company.shortName}の Instagram の最新の投稿`}
              />
            </Box>
            <Group justify="center" mt="lg">
              <Button
                component="a"
                href={instagramUrl}
                leftSection={<Icon name="instagram" size={18} />}
                radius="xl"
                rel="noopener noreferrer"
                target="_blank"
                variant="outline"
              >
                Instagram でほかの投稿を見る
              </Button>
            </Group>
          </Box>
        )}

        {sns.youtube && (
          <Paper p={{ base: 'lg', sm: 40 }} radius="md" ta="center" withBorder>
            <Group gap={8} justify="center">
              <Box c="#ff0033" style={{ display: 'flex' }}>
                <Icon name="youtube" size={26} />
              </Box>
              <Text fw={700} fz={{ base: 'md', sm: 'lg' }}>
                YouTube
              </Text>
              {!sns.youtube.url && (
                <Badge color="red" radius="sm" variant="light">
                  近日公開
                </Badge>
              )}
            </Group>
            {sns.youtube.title && (
              <Title ff={serif} fz={{ base: 21, sm: 26 }} lh={1.6} mt="lg" order={3} style={{ whiteSpace: 'pre-line' }}>
                {sns.youtube.title}
              </Title>
            )}
            <Stack gap="sm" mt="md">
              {sns.youtube.body.map((line) => (
                <Text c="gray.7" fz={{ base: 'sm', sm: 'md' }} key={line} lh={1.9} ta="left">
                  {line}
                </Text>
              ))}
            </Stack>
            {sns.youtube.url ? (
              <Group justify="center" mt="lg">
                <Button component="a" href={sns.youtube.url} radius="xl" rel="noopener noreferrer" target="_blank">
                  YouTube を見る
                </Button>
              </Group>
            ) : (
              <Text c="gray.6" fz="sm" mt="lg">
                公開まで、少々お待ちください。
              </Text>
            )}
          </Paper>
        )}
      </Stack>
    </Section>
  )
}
