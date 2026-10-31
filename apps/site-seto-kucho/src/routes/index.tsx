import { createFileRoute } from '@tanstack/react-router'
import { Area } from '../components/Area'
import { Company } from '../components/Company'
import { Contact } from '../components/Contact'
import { Faq } from '../components/Faq'
import { Flow } from '../components/Flow'
import { Footer } from '../components/Footer'
import { GooglePlaceProvider } from '../components/GooglePlace'
import { Guide } from '../components/Guide'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { Menu } from '../components/Menu'
import { MobileCta } from '../components/MobileCta'
import { Prices } from '../components/Prices'
import { ProposalBanner } from '../components/ProposalBanner'
import { Reasons } from '../components/Reasons'
import { TrustBar } from '../components/TrustBar'
import { Works } from '../components/Works'
import { getGooglePlace } from '../server/place'
import { site } from '../site.config'

export const Route = createFileRoute('/')({
  // Googleマップの評価と写真は表示のたびに取る（写真の URL は保存できないため）。
  // ページ内リンクで取り直すと写真が読み込み直しになるので、開いている間は取り直さない
  loader: () => getGooglePlace(),
  staleTime: Infinity,
  component: HomeComponent,
})

function HomeComponent() {
  const place = Route.useLoaderData()

  return (
    <GooglePlaceProvider value={place}>
      {site.site.isProposal && <ProposalBanner />}
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <Menu />
        <Works />
        <Prices />
        <Reasons />
        <Guide />
        <Flow />
        <Area />
        <Faq />
        <Company />
        <Contact />
      </main>
      <Footer />
      <MobileCta />
    </GooglePlaceProvider>
  )
}
