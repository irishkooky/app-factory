import { site } from "~/site.config";
import { Section } from "./section";

export function Services() {
  return (
    <Section eyebrow="SERVICE" id="services" soft title="サービス">
      <div className="grid gap-6 md:grid-cols-3">
        {site.services.map((service) => (
          <article
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"
            key={service.title}
          >
            {service.photo && (
              <img
                alt={service.photo.alt}
                className="aspect-[3/2] w-full object-cover"
                src={service.photo.src}
              />
            )}
            <div className="p-6">
              <h3 className="font-bold text-lg text-stone-900">
                {service.title}
              </h3>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                {service.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
