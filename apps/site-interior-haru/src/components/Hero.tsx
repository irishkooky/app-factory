import { Box, Button, Container, Flex, Text, Title } from '@mantine/core'
import { site } from '../site.config'
import { tel } from './Header'
import { Icon } from './Icon'

export function Hero() {
  const { hero, company } = site

  return (
    <Box
      component="section"
      id="top"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.45), rgba(0,0,0,0.1)), url(${hero.photo.src})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <Container py={{ base: 96, sm: 144 }} size="lg">
        <Text c="white" fw={700} fz="sm" opacity={0.85} style={{ letterSpacing: '0.1em' }}>
          {company.industry}｜{company.shortName}
        </Text>
        <Title
          c="white"
          fz={{ base: 30, sm: 48 }}
          lh={1.35}
          mt="md"
          order={1}
          style={{ whiteSpace: 'pre-line' }}
        >
          {hero.catchcopy}
        </Title>
        <Text c="white" fz={{ base: 'md', sm: 'lg' }} lh={1.8} maw={576} mt="lg" opacity={0.9}>
          {hero.lead}
        </Text>
        <Flex direction={{ base: 'column', sm: 'row' }} gap="sm" mt={40}>
          <Button component="a" href={tel} leftSection={<Icon name="phone" size={20} />} radius="xl" size="lg">
            電話で相談する
          </Button>
          <Button color="white" component="a" href="#services" radius="xl" size="lg" variant="outline">
            サービスを見る
          </Button>
        </Flex>
      </Container>
    </Box>
  )
}
