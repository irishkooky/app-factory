import type { MetadataRoute } from "next";
import { site } from "~/site.config";

export default function robots(): MetadataRoute.Robots {
  if (site.site.isProposal) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.site.url}/sitemap.xml`,
  };
}
