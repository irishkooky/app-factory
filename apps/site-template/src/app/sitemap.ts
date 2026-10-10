import type { MetadataRoute } from "next";
import { site } from "~/site.config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.site.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
