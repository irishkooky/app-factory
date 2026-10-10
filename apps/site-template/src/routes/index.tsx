import { createFileRoute } from '@tanstack/react-router'
import { About } from '../components/About'
import { Company } from '../components/Company'
import { Contact } from '../components/Contact'
import { Footer } from '../components/Footer'
import { Gallery } from '../components/Gallery'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { ProposalBanner } from '../components/ProposalBanner'
import { Services } from '../components/Services'
import { Strengths } from '../components/Strengths'
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
        <About />
        <Services />
        <Strengths />
        <Gallery />
        <Company />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
