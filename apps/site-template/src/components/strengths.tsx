import { site } from "~/site.config";
import { Section } from "./section";

export function Strengths() {
  return (
    <Section
      eyebrow="STRENGTH"
      id="strengths"
      title={`${site.company.shortName}が選ばれる理由`}
    >
      <ol className="grid gap-6 md:grid-cols-3">
        {site.strengths.map((item, i) => (
          <li className="border-brand border-t-2 pt-5" key={item.title}>
            <span className="font-bold text-3xl text-brand">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 font-bold text-lg text-stone-900">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              {item.description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
