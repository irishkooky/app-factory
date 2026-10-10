import { site } from "~/site.config";
import { Section } from "./section";

export function About() {
  const { about } = site;

  return (
    <Section eyebrow="ABOUT" id="about" title={about.title}>
      <div className="grid items-center gap-10 md:grid-cols-2">
        <p className="text-base text-stone-700 leading-loose sm:text-lg">
          {about.body}
        </p>
        {about.photo && (
          <img
            alt={about.photo.alt}
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-md"
            src={about.photo.src}
          />
        )}
      </div>
    </Section>
  );
}
