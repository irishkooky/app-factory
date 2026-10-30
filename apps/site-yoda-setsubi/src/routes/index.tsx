import { createFileRoute } from '@tanstack/react-router'
import { About } from '../components/About'
import { Area } from '../components/Area'
import { Company } from '../components/Company'
import { Contact } from '../components/Contact'
import { Faq } from '../components/Faq'
import { Flow } from '../components/Flow'
import { Footer } from '../components/Footer'
import { Gallery } from '../components/Gallery'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { MobileCta } from '../components/MobileCta'
import { ProposalBanner } from '../components/ProposalBanner'
import { Reviews } from '../components/Reviews'
import { SelfCheck } from '../components/SelfCheck'
import { Services } from '../components/Services'
import { Stats } from '../components/Stats'
import { Strengths } from '../components/Strengths'
import { Symptoms } from '../components/Symptoms'
import { Voices } from '../components/Voices'
import { site } from '../site.config'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <>
      {site.site.isProposal && <ProposalBanner />}
      <Header />
      <main>
        <Hero />
        <Stats />
        <Symptoms />
        <Services />
        <Strengths />
        <Reviews />
        <SelfCheck />
        <About />
        <Gallery />
        <Flow />
        <Voices />
        <Area />
        <Faq />
        <Company />
        <Contact />
      </main>
      <Footer />
      <MobileCta />
    </>
  )
}
