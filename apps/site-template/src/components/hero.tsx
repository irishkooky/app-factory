import { Phone } from "lucide-react";
import { site } from "~/site.config";

export function Hero() {
  const { hero, company, contact } = site;

  return (
    <section className="relative isolate overflow-hidden" id="top">
      <img
        alt={hero.photo.alt}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        src={hero.photo.src}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/45 to-black/10" />

      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-36">
        <p className="font-semibold text-sm text-white/85 tracking-widest">
          {company.industry}｜{company.shortName}
        </p>
        <h1 className="mt-4 whitespace-pre-line font-bold text-3xl text-white leading-snug sm:text-5xl sm:leading-tight">
          {hero.catchcopy}
        </h1>
        <p className="mt-6 max-w-xl text-base text-white/90 leading-relaxed sm:text-lg">
          {hero.lead}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 font-semibold text-white shadow-lg transition-colors hover:bg-brand-dark"
            href={`tel:${contact.phone.replaceAll("-", "")}`}
          >
            <Phone className="h-5 w-5" />
            電話で相談する
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full border border-white/70 px-7 py-4 font-semibold text-white transition-colors hover:bg-white/10"
            href="#services"
          >
            サービスを見る
          </a>
        </div>
      </div>
    </section>
  );
}
