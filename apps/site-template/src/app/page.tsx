import { About } from "~/components/about";
import { Company } from "~/components/company";
import { Contact } from "~/components/contact";
import { Footer } from "~/components/footer";
import { Gallery } from "~/components/gallery";
import { Header } from "~/components/header";
import { Hero } from "~/components/hero";
import { ProposalBanner } from "~/components/proposal-banner";
import { Services } from "~/components/services";
import { Strengths } from "~/components/strengths";
import { site } from "~/site.config";

export default function Home() {
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
  );
}
