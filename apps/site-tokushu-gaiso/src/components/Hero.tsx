import { Box, Button, Container, Flex, Group, Text, Title } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Icon } from './Icon'

export function Hero() {
  const { hero, company, contact } = site

  return (
    <Box
      component="section"
      id="top"
      pos="relative"
      style={{
        backgroundColor: 'var(--mantine-color-brand-9)',
        backgroundImage: `linear-gradient(100deg, rgba(20,24,20,0.85) 0%, rgba(20,24,20,0.6) 50%, rgba(20,24,20,0.2) 100%), url(${hero.photo.src})`,
        backgroundPosition: hero.photo.position ?? 'center',
        backgroundSize: 'cover',
      }}
    >
      <Container
        size="lg"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 'min(88vh, 760px)' }}
        py={{ base: 88, sm: 120 }}
      >
        <Text c="white" fw={500} fz={{ base: 'xs', sm: 'sm' }} opacity={0.85} style={{ letterSpacing: '0.2em' }}>
          {company.industry}｜{company.shortName}
        </Text>
        <Title
          c="white"
          fw={600}
          fz={{ base: 34, sm: 56 }}
          lh={1.45}
          mt={{ base: 'md', sm: 'lg' }}
          order={1}
          style={{ textShadow: '0 2px 24px rgba(0,0,0,0.3)', whiteSpace: 'pre-line' }}
        >
          {hero.catchcopy}
        </Title>
        <Text c="white" fz={{ base: 'sm', sm: 'lg' }} lh={2} maw={560} mt="xl" opacity={0.92}>
          {hero.lead}
        </Text>

        {hero.badges && (
          <Group gap={8} mt="xl">
            {hero.badges.map((badge) => (
              <Text
                c="white"
                fw={500}
                fz={{ base: 'xs', sm: 'sm' }}
                key={badge}
                px={14}
                py={6}
                style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: 999, backdropFilter: 'blur(4px)' }}
              >
                {badge}
              </Text>
            ))}
          </Group>
        )}

        <Flex align={{ base: 'stretch', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="md" mt={40}>
          <Button
            color="white"
            component="a"
            href={tel}
            leftSection={<Icon name="phone" size={22} />}
            radius="xl"
            size="xl"
            styles={{ label: { fontSize: 22, letterSpacing: '0.04em' } }}
            variant="white"
            c="brand.8"
          >
            {contact.phone}
          </Button>
          <Text c="white" fz="sm" opacity={0.85}>
            受付 {contact.hours}
            {contact.holidays && `（${contact.holidays}休み）`}
            <br />
            お見積もりのご相談もどうぞ
          </Text>
        </Flex>
      </Container>
    </Box>
  )
}
