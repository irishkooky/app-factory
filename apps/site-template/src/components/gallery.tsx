import { site } from "~/site.config";
import { Section } from "./section";

export function Gallery() {
  if (!site.gallery?.photos.length) return null;

  return (
    <Section eyebrow="WORKS" id="works" soft title={site.gallery.title}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {site.gallery.photos.map((photo) => (
          <img
            alt={photo.alt}
            className="aspect-square w-full rounded-xl object-cover"
            key={photo.src}
            src={photo.src}
          />
        ))}
      </div>
    </Section>
  );
}
