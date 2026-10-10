import type { APIRoute } from "astro";
import { site } from "~/site.config";

export const GET: APIRoute = () => {
  const body = site.site.isProposal
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\n\nSitemap: ${site.site.url}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
