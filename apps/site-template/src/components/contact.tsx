import { Mail, Phone } from "lucide-react";
import { site } from "~/site.config";

export function Contact() {
  const { contact, company } = site;

  return (
    <section className="bg-brand-dark text-white" id="contact">
      <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 sm:py-24">
        <p className="font-semibold text-white/70 text-xs tracking-[0.25em]">
          CONTACT
        </p>
        <h2 className="mt-2 font-bold text-2xl sm:text-3xl">
          お見積もり・ご相談はお気軽に
        </h2>
        <p className="mt-4 text-white/80">
          {company.shortName}が直接お話を伺います。
        </p>

        <a
          className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-5 font-bold text-2xl text-brand-dark shadow-lg transition-transform hover:scale-[1.02] sm:text-3xl"
          href={`tel:${contact.phone.replaceAll("-", "")}`}
        >
          <Phone className="h-7 w-7" />
          {contact.phone}
        </a>
        <p className="mt-3 text-sm text-white/70">
          受付 {contact.hours}
          {contact.holidays && `（${contact.holidays}を除く）`}
        </p>

        {contact.email && (
          <a
            className="mt-8 inline-flex items-center gap-2 text-white/90 underline underline-offset-4 hover:text-white"
            href={`mailto:${contact.email}`}
          >
            <Mail className="h-5 w-5" />
            {contact.email}
          </a>
        )}
      </div>
    </section>
  );
}
