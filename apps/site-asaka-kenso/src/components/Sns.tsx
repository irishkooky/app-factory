import { Badge, Box, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
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
                src={`${instagramUrl}embed/`}
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
          <Paper p={{ base: 'lg', sm: 'xl' }} radius="md" ta="center" withBorder>
            <Group gap={8} justify="center">
              <Box c="#ff0033" style={{ display: 'flex' }}>
                <Icon name="youtube" size={26} />
              </Box>
              <Title fz={{ base: 18, sm: 20 }} order={3}>
                YouTube
              </Title>
              {!sns.youtube.url && (
                <Badge color="gray" radius="sm" variant="light">
                  準備中
                </Badge>
              )}
            </Group>
            <Text c="gray.7" fz={{ base: 'sm', sm: 'md' }} lh={1.9} mt="md">
              {sns.youtube.note}
            </Text>
            {sns.youtube.url && (
              <Group justify="center" mt="lg">
                <Button component="a" href={sns.youtube.url} radius="xl" rel="noopener noreferrer" target="_blank">
                  YouTube を見る
                </Button>
              </Group>
            )}
          </Paper>
        )}
      </Stack>
    </Section>
  )
}
