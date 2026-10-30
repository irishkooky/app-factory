import { Box, Button, Container, Text, Title } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { GoogleImg, PhotoCredit, Stars, useGooglePlace } from './GooglePlace'
import { tel } from './Header'
import { Icon } from './Icon'
import { LogoMark } from './Logo'
import { OpenNow } from './OpenNow'

export function Hero() {
  const { hero, contact, credentials } = site

  return (
    <Box className="yd-hero" component="section" id="top">
      <div aria-hidden className="yd-ripples">
        <span />
        <span />
        <span />
      </div>
      <Container pos="relative" pb={{ base: 56, md: 104 }} pt={{ base: 40, md: 88 }} size="lg">
        <div className="yd-hero-grid">
          <Box style={{ gridArea: 'copy' }}>
            <Box
              className="yd-rise"
              component="a"
              href="#credentials"
              style={{
                alignItems: 'center',
                border: '1px solid rgba(226,173,110,0.5)',
                borderRadius: 999,
                color: '#f0c895',
                display: 'inline-flex',
                fontSize: 13,
                fontWeight: 700,
                gap: 8,
                letterSpacing: '0.04em',
                padding: '7px 14px 7px 12px',
                textDecoration: 'none',
              }}
            >
              <Icon name="shield" size={16} />
              {credentials[0].title}
              <Box component="span" style={{ color: '#fff' }}>
                第5296号
              </Box>
            </Box>
            <Title
              c="white"
              className="yd-rise yd-rise-2"
              fw={700}
              fz={{ base: 38, xs: 44, sm: 54, lg: 62 }}
              lh={1.32}
              mt={{ base: 22, md: 28 }}
              order={1}
              style={{ letterSpacing: '0.06em', whiteSpace: 'pre-line' }}
            >
              {hero.catchcopy}
            </Title>
            <Text className="yd-rise yd-rise-3 yd-phrase" c="rgba(255,255,255,0.86)" fz={{ base: 15, sm: 17 }} lh={2} maw={540} mt={{ base: 20, md: 28 }}>
              {hero.lead}
            </Text>
          </Box>

          <Box className="yd-rise yd-rise-3" style={{ gridArea: 'photos' }}>
            <PhotoStack />
          </Box>

          <Box className="yd-rise yd-rise-4" style={{ gridArea: 'call' }}>
            <Button
              className="yd-cta"
              component="a"
              fullWidth
              h={{ base: 66, sm: 72 }}
              href={tel}
              leftSection={<Icon name="phone" size={26} />}
              maw={{ sm: 400 }}
              radius="xl"
              styles={{ label: { fontFamily: serif, fontSize: 28, fontWeight: 700, letterSpacing: '0.05em' } }}
            >
              {contact.phone}
            </Button>
            <Box mt={16}>
              <OpenNow tone="light" />
            </Box>
            <Text c="rgba(255,255,255,0.7)" fz={13} lh={1.9} mt={8}>
              受付 {contact.hours}
              <br />
              {contact.missedCall}
            </Text>
          </Box>
        </div>
      </Container>
    </Box>
  )
}

/** 先方が Googleマップに載せた施工写真を、印画紙のように3枚重ねる */
function PhotoStack() {
  const { heroPhotos, rating, count, reviewsUri } = useGooglePlace()
  // CSS の重なり順は 奥左・奥右・手前。heroPhotos の先頭を手前に置く
  const prints = [heroPhotos[1], heroPhotos[2], heroPhotos[0]].filter((photo) => photo !== undefined)

  return (
    <Box>
      <Box pb={{ base: 40, md: 16 }} pos="relative">
        {prints.length ? (
          <div className="yd-stack">
            {prints.map((photo) => (
              <figure className="yd-print" key={photo.src} style={{ margin: 0 }}>
                <div className="yd-print-photo">
                  <GoogleImg eager photo={photo} />
                </div>
                <figcaption>
                  <span>{photo.note?.title ?? '施工写真'}</span>
                  {photo.note?.price && <b>{photo.note.price}</b>}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          // 写真が取れないときは、マークだけで静かに見せる
          <Box className="yd-stack" style={{ alignItems: 'center', display: 'flex', justifyContent: 'center' }}>
            <Box style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.35))', transform: 'rotate(-4deg)' }}>
              <LogoMark size={200} />
            </Box>
          </Box>
        )}

        <Box
          aria-label={`Googleマップの評価 ${rating.toFixed(1)}、クチコミ${count}件`}
          className="yd-rating-card"
          component="a"
          href={reviewsUri}
          rel="noopener"
          target="_blank"
        >
          <Text c="dimmed" fw={700} fz={11} style={{ letterSpacing: '0.08em' }}>
            Googleマップの評価
          </Text>
          <Box style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
            <Text ff={serif} fw={800} fz={34} lh={1.1}>
              {rating.toFixed(1)}
            </Text>
            <Box>
              <Stars size={15} />
              <Text c="dimmed" fw={500} fz={12} mt={2}>
                クチコミ {count}件
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      {prints.length > 0 && (
        <Box mt={{ base: 14, md: 18 }} ta={{ base: 'left', md: 'right' }}>
          <PhotoCredit dark photos={prints} />
        </Box>
      )}
    </Box>
  )
}
